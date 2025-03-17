import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
  DependencyRepository,
  DependencyRepositoryDocument,
} from 'src/database/dependency-repository-schema/dependency-repository.schema';
import {
  GithubApp,
  GithubAppDocument,
} from '../../database/githubapp-schema/github-app.schema';
import {
  Repository,
  RepositoryDocument,
} from '../../database/repository-schema/repository.schema';
import { User, UserDocument } from '../../database/user-schema/user.schema';
import { DependenciesService } from '../dependencies/dependencies.service';
import { GithubAppService } from '../github-app/github-app.service';
import { validatePagination } from './validator/pagination.validator';
@Injectable()
export class RepositoryService {
  constructor(
    private readonly httpService: HttpService,
    private readonly githubAppService: GithubAppService,
    private readonly dependencyService: DependenciesService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Repository.name)
    private RepositoryModel: Model<RepositoryDocument>,
    @InjectModel(GithubApp.name)
    private GithubAppModel: Model<GithubAppDocument>,
    @InjectModel(DependencyRepository.name)
    private DependencyRepositoryModel: Model<DependencyRepositoryDocument>,
  ) {}
  onModuleInit() {
    this.watchRepositorySelection(); // listent to db changes
  }
  private watchRepositorySelection() {
    const changeStream = this.RepositoryModel.watch([
      {
        $match: {
          operationType: 'update',
          'updateDescription.updatedFields.isSelected': true, // listen to db changes when isSelected is equal to true
        },
      },
    ]);

    changeStream.on('change', async (change) => {
      console.log(change);

      const { documentKey, updateDescription } = change;
      console.log(
        `Repository ID: ${documentKey._id}, isSelected: ${updateDescription.updatedFields.isSelected}`,
      );

      // Extract repository ID
      const repoId = documentKey._id.toString();

      try {
        // Fetch the full repository document
        const repository = await this.RepositoryModel.findOne({
          _id: new Types.ObjectId(repoId),
        })
          .populate('user') // Optionally populate user and other references
          .exec();

        if (repository) {
          await this.saveDependencies(
            repository._id.toString(),
            repository.user['_id'].toString(),
          );
        } else {
          console.log('Repository not found');
        }
      } catch (error) {
        console.error('Error fetching repository:', error);
      }
    });

    changeStream.on('error', (error) => {
      console.error('Change Stream Error:', error);
    });
  }
  private getRepositoriesPipeline(
    userId: string,
    skipVal: number,
    limit: number,
    onlySelected: boolean = false,
  ) {
    const matchConditions: any = {
      user: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (onlySelected) {
      matchConditions.isSelected = true;
    }

    return [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'githubapps',
          localField: 'githubApp',
          foreignField: '_id',
          as: 'githubApp',
        },
      },
      {
        $unwind: {
          path: '$githubApp',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'githubApp.isDeleted': false,
        },
      },
      {
        $facet: {
          repositories: [
            { $skip: skipVal },
            { $limit: limit },
            {
              $project: {
                githubApp: 0,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];
  }
  async getAllRepos(userId: string, page = 1, limit = 10) {
    const user = await this.userModel.findById(userId).exec();
    const { pageNum, limitNum } = validatePagination(page, limit);

    const skipVal = (pageNum - 1) * limitNum;
    if (!user) {
      throw new UnauthorizedException('User is not valid');
    }

    const githubApps = await this.GithubAppModel.find({
      user: user,
      isDeleted: false,
    });

    if (githubApps.length === 0) {
      throw new BadRequestException('No GitHub app is installed');
    }

    try {
      const bulkOps = [];

      for (let i = 0; i < githubApps.length; i += 1) {
        try {
          const token = await this.githubAppService.createInstallationToken(
            githubApps[i].installationId,
          );
          console.log(`Querying API with access token: ${token}`);

          const response = await firstValueFrom(
            this.httpService.get(
              'https://api.github.com/installation/repositories',
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/vnd.github.v3+json',
                },
                params: {
                  visibility: 'all',
                  affiliation: 'owner,collaborator,organization_member',
                  per_page: 100, // Maximum number of repos per page
                },
              },
            ),
          );

          // console.log(response.data.repositories[0]);

          for (const repo of response.data.repositories) {
            bulkOps.push({
              updateOne: {
                filter: {
                  user: user.id,
                  repoUrl: repo.url,
                }, // Match by user.id and repoUrl
                update: {
                  $set: {
                    user,
                    repoName: repo.full_name,
                    repoUrl: repo.url,
                    htmlUrl: repo.html_url,
                    repoDescription: repo.description,
                    owner: repo.owner.login,
                    ownerType: repo.owner.type,
                    isPrivate: repo.private,
                    defaultBranch: repo.default_branch,
                    githubApp: githubApps[i],
                    isDeleted: false,
                  },
                },
                upsert: true, // Insert if not found
              },
            });
          }
        } catch (error) {
          console.error(
            `Error fetching repositories for installation ${githubApps[i].installationId}:`,
            error.message,
          );
          continue; // Skip to the next GitHub App
        }
      }

      if (bulkOps.length > 0) {
        await this.RepositoryModel.bulkWrite(bulkOps);
      }
      const pipeline = this.getRepositoriesPipeline(userId, skipVal, limitNum);
      const repositories = await this.RepositoryModel.aggregate(pipeline);

      const repositoriesResult = repositories[0].repositories;
      const totalCountResult =
        repositories[0].totalCount.length > 0
          ? repositories[0].totalCount[0].count
          : 0;

      return {
        repositories: repositoriesResult,
        totalCount: totalCountResult,
      };
    } catch (error) {
      console.error('Unexpected error in getAllRepos:', error.message);
    }
  }

  async selectRepos(urlIds: string[]) {
    // Find matching repositories
    const matchedRepos = await this.RepositoryModel.find(
      {
        _id: { $in: urlIds },
        isDeleted: false,
      },
      { _id: 1 },
    );

    // Extract matched IDs
    const matchedIds = matchedRepos.map((repo) => repo._id.toString());

    // Check if all urlIds are found
    const notFoundIds = urlIds.filter((id) => !matchedIds.includes(id));
    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `Repositories not found or deleted: ${notFoundIds.join(', ')}`,
      );
    }

    // Update the matched repositories
    const updated = await this.RepositoryModel.updateMany(
      { _id: { $in: matchedIds } },
      { $set: { isSelected: true } },
    );

    return updated;
  }
  async selectRepo(urlId: string) {
    // Find the repository by ID and ensure it's not deleted
    const repo = await this.RepositoryModel.findOne(
      { _id: urlId, isDeleted: false },
      { _id: 1, repoUrl: 1, githubApp: 1 },
    ).populate('githubApp');

    // If the repository is not found, throw an error
    if (!repo) {
      throw new NotFoundException(`Repository not found or deleted: ${urlId}`);
    }

    console.log(repo);

    const accessToken = await this.githubAppService.createInstallationToken(
      repo.githubApp.installationId,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${repo.repoUrl}/contents/package-lock.json`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }),
      );

      const dependencyFile = response.data;
      const dependencyFileContentDecoded = atob(dependencyFile.content);
      const dependencyJSON = JSON.parse(dependencyFileContentDecoded);
      const allDependencies = Object.keys(dependencyJSON['packages']);
      console.log(allDependencies);
    } catch (error) {
      console.log(error);
    }

    // Update the repository to mark it as selected
    return await this.RepositoryModel.updateOne(
      { _id: urlId },
      { $set: { isSelected: true } },
    );
  }

  async selectedRepos(page = 1, limit = 10, userId: string) {
    const user = await this.userModel.findById(userId).exec();
    const { pageNum, limitNum } = validatePagination(page, limit);
    const skipVal = (pageNum - 1) * limitNum;

    if (!user) {
      throw new UnauthorizedException('User is not valid');
    }

    const pipeline = this.getRepositoriesPipeline(
      userId,
      skipVal,
      limitNum,
      true,
    );
    const repositories = await this.RepositoryModel.aggregate(pipeline);

    const repositoriesResult = repositories[0].repositories;
    const totalCountResult =
      repositories[0].totalCount.length > 0
        ? repositories[0].totalCount[0].count
        : 0;

    return {
      repositories: repositoriesResult,
      totalCount: totalCountResult,
    };
  }
  async selectAll(userId: string) {
    const response = await this.RepositoryModel.updateMany(
      { user: new Types.ObjectId(userId), isDeleted: false },
      {
        $set: { isSelected: true },
      },
    );
    return response;
  }
  formatDependencies(dependencies: Record<string, string>) {
    return Object.entries(dependencies).map(([pkg, version]) => ({
      package: pkg,
      version:
        typeof version === 'string'
          ? pkg + '-' + version.replace(/^[^\d]+/, '')
          : '',
    }));
  }
  async saveDependencies(repoId: string, userId: string) {
    const repository = await this.RepositoryModel.findOne({
      _id: new Types.ObjectId(repoId),
      user: new Types.ObjectId(userId),
      isDeleted: false,
    }).populate('githubApp');

    if (!repository) {
      throw new NotFoundException('Repository not found.');
    }

    const accessToken = await this.githubAppService.createInstallationToken(
      repository.githubApp.installationId,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${repository.repoUrl}/contents/package.json`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }),
      );

      const dependencyFile = response.data;
      const dependencyFileContentDecoded = atob(dependencyFile.content);
      const dependencyJSON = JSON.parse(dependencyFileContentDecoded);
      const allDependencies = {
        ...dependencyJSON['dependencies'],
        ...dependencyJSON['devDependencies'],
      };

      // Format dependencies
      const formattedDependencies = this.formatDependencies(allDependencies);

      // Get dependency entries in bulk
      // const dependencyEntries = await Promise.all(
      //   formattedDependencies.map((dep) =>
      //     this.dependencyService.create({ dependencyName: dep.package }),
      //   ),
      // );

      const dependencyEntries = [];

      // Prepare bulk insert operations
      const bulkOps = dependencyEntries.map((entry, index) => ({
        updateOne: {
          filter: {
            repositoryId: new Types.ObjectId(repoId),
            dependencyId: entry._id,
          },
          update: {
            $set: { installedVersion: formattedDependencies[index].version },
          },
          upsert: true,
        },
      }));

      // Perform bulk insert/update
      if (bulkOps.length > 0) {
        // await this.DependencyRepositoryModel.bulkWrite(bulkOps);
      }

      return 'Done';
    } catch (error) {
      console.error(error);
      throw new NotFoundException('Could not retrieve package.json');
    }
  }
  async readDependencies(repoId: string, userId: string) {
    const repository = await this.RepositoryModel.findOne({
      _id: new Types.ObjectId(repoId),
      user: new Types.ObjectId(userId),
      isDeleted: false,
    }).populate('githubApp');
    if (repository) {
      const accessToken = await this.githubAppService.createInstallationToken(
        repository.githubApp.installationId,
      );

      try {
        const response = await firstValueFrom(
          this.httpService.get(repository.repoUrl + `/contents/package.json`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }),
        ); // files can be listed using repository.repoUrl/contents/

        const dependencyFile = response.data;
        const dependencyFileContentDecoded = atob(dependencyFile.content);
        return dependencyFileContentDecoded;
      } catch (error) {
        console.log(error);
        throw new NotFoundException('Could not retrieve repository listing');
      }
    } else {
      throw new NotFoundException('Repository not found.');
    }
  }
}
