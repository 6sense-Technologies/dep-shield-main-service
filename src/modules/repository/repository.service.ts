import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User, UserDocument } from '../../database/user-schema/user.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  Repository,
  RepositoryDocument,
} from '../../database/repository-schema/repository.schema';
import {
  GithubApp,
  GithubAppDocument,
} from '../../database/githubapp-schema/github-app.schema';
import { GithubAppService } from '../github-app/github-app.service';
import { validatePagination } from './validator/pagination.validator';
@Injectable()
export class RepositoryService {
  constructor(
    private readonly httpService: HttpService,
    private readonly githubAppService: GithubAppService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Repository.name)
    private RepositoryModel: Model<RepositoryDocument>,
    @InjectModel(GithubApp.name)
    private GithubAppModel: Model<GithubAppDocument>,
  ) {}
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
    const updated = await this.RepositoryModel.updateMany(
      { _id: { $in: urlIds } }, // Selects all documents where _id is in urlIds array
      { $set: { isSelected: true } }, // Updates isSelected to true
    );

    return updated;
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
}
