import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { readFileSync } from 'fs';
import { isValidObjectId, Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
    DependencyRepository,
    DependencyRepositoryDocument,
} from '../../database/dependency-repository-schema/dependency-repository.schema';
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
    // onModuleInit() {
    //     this.watchRepositorySelection(); // listent to db changes
    // }
    // private watchRepositorySelection() {
    //     const changeStream = this.RepositoryModel.watch([
    //         {
    //             $match: {
    //                 operationType: 'update',
    //                 'updateDescription.updatedFields.isSelected': true, // listen to db changes when isSelected is equal to true
    //             },
    //         },
    //     ]);

    //     changeStream.on('change', async (change) => {
    //         console.log(change);

    //         const { documentKey, updateDescription } = change;
    //         console.log(
    //             `Repository ID: ${documentKey._id}, isSelected: ${updateDescription.updatedFields.isSelected}`,
    //         );

    //         // Extract repository ID
    //         const repoId = documentKey._id.toString();

    //         try {
    //             // Fetch the full repository document
    //             const repository = await this.RepositoryModel.findOne({
    //                 _id: new Types.ObjectId(repoId),
    //             })
    //                 .populate('user') // Optionally populate user and other references
    //                 .exec();

    //             if (repository) {
    //                 await this.saveDependencies(
    //                     repository._id.toString(),
    //                     repository.user['_id'].toString(),
    //                 );
    //             } else {
    //                 console.log('Repository not found');
    //             }
    //         } catch (error) {
    //             console.error('Error fetching repository:', error);
    //         }
    //     });

    //     changeStream.on('error', (error) => {
    //         console.error('Change Stream Error:', error);
    //     });
    // }

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
    async getAllRepos(userId: string, page: number, limit: number) {
        const user = await this.userModel.findById(userId).exec();
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }
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
                    const token =
                        await this.githubAppService.createInstallationToken(
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
                                    affiliation:
                                        'owner,collaborator,organization_member',
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
            const pipeline = this.getRepositoriesPipeline(
                userId,
                skipVal,
                limitNum,
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

    getPackageName(path: string) {
        const matches = path.match(/node_modules\/(@?[^\/]+)/g);
        return matches ? matches.pop().replace('node_modules/', '') : null;
    }

    async getDependencyFileContent() {
        return await JSON.parse(
            readFileSync('public/package-lock.json')?.toString(),
        );
    }

    // async selectRepoDemo(urlId: string) {
    //     // Find the repository by ID and ensure it's not deleted
    //     const repo = { _id: '67c7ad1743029bcbed4be37b' };

    //     // If the repository is not found, throw an error
    //     // if (!repo) {
    //     //     throw new NotFoundException(
    //     //         `Repository not found or deleted: ${urlId}`,
    //     //     );
    //     // }

    //     // console.log(repo);

    //     // const accessToken = await this.githubAppService.createInstallationToken(
    //     //     repo.githubApp.installationId,
    //     // );

    //     try {
    //         // const response = await firstValueFrom(
    //         //     this.httpService.get(
    //         //         `${repo.repoUrl}/contents/package-lock.json`,
    //         //         {
    //         //             headers: {
    //         //                 Authorization: `Bearer ${accessToken}`,
    //         //                 Accept: 'application/vnd.github.v3+json',
    //         //                 'X-GitHub-Api-Version': '2022-11-28',
    //         //             },
    //         //         },
    //         //     ),
    //         // );

    //         // const dependencyFile = response.data;
    //         // const dependencyFileContentDecoded = atob(dependencyFile.content);
    //         // const dependencyObj = JSON.parse(dependencyFileContentDecoded);
    //         const dependencyObj = await this.getDependencyFileContent();
    //         const allDependencies: [string, any][] = Object.entries(
    //             dependencyObj['packages'],
    //         );
    //         const dependencyVersion = {};

    //         // allDependencies.forEach((dep) => {
    //         //     dependencyVersion[dep] = dependencyObj['packages'][dep].version;
    //         // });

    //         for (const [dependency, dependencyData] of allDependencies) {
    //             if (!dependency) continue;

    //             const packageName = this.getPackageName(dependency);
    //             const packageVersion = dependencyData.version;
    //             let dependencyRepo;

    //             if (!dependencyVersion[packageName]) {
    //                 dependencyVersion[packageName] = [];
    //             }

    //             //if (!dependencyVersion[packageName].includes(packageVersion)) {
    //             dependencyVersion[packageName].push(packageVersion);
    //             const installedDep = await this.dependencyService.create({
    //                 dependencyName: packageName,
    //             });
    //             // const installedDep = { _id: '67c7ad1743029bcbed4be37b' };
    //             dependencyRepo = await this.DependencyRepositoryModel.findOne({
    //                 dependencyId: installedDep._id,
    //                 repositoryId: repo._id,
    //                 installedVersion: packageVersion,
    //             });
    //             if (!dependencyRepo) {
    //                 dependencyRepo =
    //                     await this.DependencyRepositoryModel.create({
    //                         dependencyId: installedDep._id,
    //                         repositoryId: repo._id,
    //                         installedVersion: packageVersion,
    //                     });
    //                 console.log('creating');
    //             }
    //             //}
    //             console.log(packageName, packageVersion, installedDep._id);
    //             if (dependencyData.dependencies) {
    //                 for (const [subDep, subDepVersion] of Object.entries(
    //                     dependencyData.dependencies,
    //                 )) {
    //                     console.log(subDep, subDepVersion, 'sub');

    //                     await this.registerSubDependency(
    //                         subDep,
    //                         repo._id as string,
    //                         subDepVersion as string,
    //                         installedDep._id as string,
    //                         'dependency',
    //                     );
    //                 }
    //             }

    //             if (dependencyData.peerDependencies) {
    //                 for (const [subDep, subDepVersion] of Object.entries(
    //                     dependencyData.peerDependencies,
    //                 )) {
    //                     // await this.registerSubDependency(
    //                     //     subDep,
    //                     //     repo._id as string,
    //                     //     subDepVersion as string,
    //                     //     installedDep._id as string,
    //                     //     'peerDependency',
    //                     // );
    //                     console.log(subDep, subDepVersion, 'sub');
    //                 }
    //             }
    //         }
    //     } catch (error) {
    //         console.log(error);
    //     }
    // }

    async scanRepo(repoId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        // Find the repository by ID and ensure it's not deleted
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1, repoUrl: 1, githubApp: 1 },
        )
            .populate('githubApp')
            .lean();

        if (!repo) {
            throw new NotFoundException(
                `Repository not found or deleted: ${repoId}`,
            );
        }

        await this.removeDependencyReposByRepoId(repoId);

        const accessToken = await this.githubAppService.createInstallationToken(
            repo.githubApp.installationId,
        );

        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${repo.repoUrl}/contents/package-lock.json`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github.v3+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    },
                ),
            );

            const dependencyFile = response.data;
            const dependencyFileContentDecoded = atob(dependencyFile.content);
            const dependencyObj = JSON.parse(dependencyFileContentDecoded);
            const allDependencies: [string, any][] = Object.entries(
                dependencyObj['packages'],
            );

            // allDependencies.forEach((dep) => {
            //     dependencyVersion[dep] = dependencyObj['packages'][dep].version;
            // });

            for (const [dependency, dependencyData] of allDependencies) {
                if (!dependency) continue;

                const packageName = this.getPackageName(dependency);
                const packageVersion = dependencyData.version;
                // if (!dependencyVersion[packageName].includes(packageVersion)) {

                let installedDep =
                    await this.dependencyService.findDependencyByName(
                        packageName,
                    );

                if (!installedDep) {
                    installedDep = await this.dependencyService.create({
                        dependencyName: packageName,
                    });
                }
                // let dependencyRepo;
                // dependencyRepo = await this.DependencyRepositoryModel.findOne({
                //     dependencyId: installedDep._id,
                //     repositoryId: repo._id,
                //     installedVersion: packageVersion,
                // });
                // if (!dependencyRepo) {
                //     dependencyRepo =
                //         await this.DependencyRepositoryModel.create({
                //             dependencyId: installedDep._id,
                //             repositoryId: repo._id,
                //             installedVersion: packageVersion,
                //         });
                // }
                //}

                await this.DependencyRepositoryModel.findOneAndUpdate(
                    {
                        dependencyId: installedDep._id,
                        repositoryId: repo._id,
                        installedVersion: packageVersion,
                    },
                    {
                        $set: {
                            isDeleted: false,
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                    },
                ).lean();

                if (dependencyData.dependencies) {
                    for (const [subDep, subDepVersion] of Object.entries(
                        dependencyData.dependencies,
                    )) {
                        await this.registerSubDependency(
                            subDep,
                            repo._id as string,
                            subDepVersion as string,
                            installedDep._id as string,
                            'dependency',
                        );
                    }
                }

                if (dependencyData.peerDependencies) {
                    for (const [subDep, subDepVersion] of Object.entries(
                        dependencyData.dependencies,
                    )) {
                        await this.registerSubDependency(
                            subDep,
                            repo._id as string,
                            subDepVersion as string,
                            installedDep._id as string,
                            'peerDependency',
                        );
                    }
                }
            }
        } catch (error) {
            console.log(error);
            throw new NotFoundException('Could not retrieve package-lock.json');
        }

        return {
            message:
                'Dependencies scanned successfully. It will take some time to process',
        };
    }

    async removeDependencyReposByRepoId(repoId: string) {
        return await this.DependencyRepositoryModel.updateMany(
            { repositoryId: new Types.ObjectId(repoId) },
            { $set: { isDeleted: true } },
        );
    }

    async addDependencyReposByRepoId(repoId: string) {
        return await this.DependencyRepositoryModel.updateMany(
            { repositoryId: new Types.ObjectId(repoId) },
            { $set: { isDeleted: false } },
        );
    }

    async selectRepo(repoId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1, repoUrl: 1, githubApp: 1 },
        ).populate('githubApp');

        if (!repo) {
            throw new NotFoundException(
                `Repository not found or deleted: ${repoId}`,
            );
        }

        await this.addDependencyReposByRepoId(repoId);

        return await this.RepositoryModel.updateOne(
            { _id: repoId },
            { $set: { isSelected: true } },
        );
    }

    async unSelectRepo(repoId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        // Find the repository by ID and ensure it's not deleted
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1 },
        );

        // If the repository is not found, throw an error
        if (!repo) {
            throw new NotFoundException(
                `Repository not found or deleted: ${repoId}`,
            );
        }

        await this.removeDependencyReposByRepoId(repoId);

        // Update the repository to mark it as unselected
        return await this.RepositoryModel.updateOne(
            { _id: repoId },
            { $set: { isSelected: false } },
        );
    }

    private async registerSubDependency(
        subDep: string,
        repoId: string,
        subDepVersion: string,
        parentDependencyId: string,
        dependencyType: string,
    ) {
        let installedSubDep =
            await this.dependencyService.findDependencyByName(subDep);

        if (!installedSubDep) {
            installedSubDep = await this.dependencyService.create({
                dependencyName: subDep,
            });
        }
        // console.log('dependency install. trying for repo');
        // console.log(
        //     subDep,
        //     repoId,
        //     subDepVersion,
        //     parentDependencyId,
        //     installedSubDep._id,
        // );
        await this.DependencyRepositoryModel.findOneAndUpdate(
            {
                dependencyId: installedSubDep._id, // new Types.ObjectId(installedSubDep._id as string),
                repositoryId: new Types.ObjectId(repoId),
                requiredVersion: subDepVersion,
                parent: new Types.ObjectId(parentDependencyId),
                dependencyType: dependencyType,
            },
            {
                $set: { isDeleted: false },
            },
            {
                upsert: true,
                new: true,
            },
        ).lean();
    }

    async selectedRepos(page: number, limit: number, userId: string) {
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }

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
                this.httpService.get(
                    `${repository.repoUrl}/contents/package.json`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github.v3+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    },
                ),
            );

            const dependencyFile = response.data;
            const dependencyFileContentDecoded = atob(dependencyFile.content);
            const dependencyJSON = JSON.parse(dependencyFileContentDecoded);
            const allDependencies = {
                ...dependencyJSON['dependencies'],
                ...dependencyJSON['devDependencies'],
            };

            // Format dependencies
            const formattedDependencies =
                this.formatDependencies(allDependencies);

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
                        $set: {
                            installedVersion:
                                formattedDependencies[index].version,
                        },
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
            const accessToken =
                await this.githubAppService.createInstallationToken(
                    repository.githubApp.installationId,
                );

            try {
                const response = await firstValueFrom(
                    this.httpService.get(
                        repository.repoUrl + `/contents/package.json`,
                        {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                Accept: 'application/vnd.github.v3+json',
                                'X-GitHub-Api-Version': '2022-11-28',
                            },
                        },
                    ),
                ); // files can be listed using repository.repoUrl/contents/

                const dependencyFile = response.data;
                const dependencyFileContentDecoded = atob(
                    dependencyFile.content,
                );
                return dependencyFileContentDecoded;
            } catch (error) {
                console.log(error);
                throw new NotFoundException(
                    'Could not retrieve repository listing',
                );
            }
        } else {
            throw new NotFoundException('Repository not found.');
        }
    }

    async getRepositoryByUserId(userId: string, repoId: string) {
        const repository = await this.RepositoryModel.findOne({
            _id: new Types.ObjectId(repoId),
            user: new Types.ObjectId(userId),
        });

        return repository;
    }

    async getDependencyRepoById(repoId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        const dependencyRepo = await this.DependencyRepositoryModel.findOne({
            _id: new Types.ObjectId(repoId),
        }).populate('dependencyId');

        return dependencyRepo;
    }

    async getInstalledDependenciesByRepoId(repoId: string) {
        const dependencies = await this.DependencyRepositoryModel.find({
            repositoryId: new Types.ObjectId(repoId),
            installedVersion: { $ne: null },
            isDeleted: false,
        }).populate('dependencyId');
        return { data: dependencies, count: dependencies.length };
    }

    // need to be uncommented when the function is used to update all dependencies to not deleted
    // async updateAllDependencyRepo() {
    //     return await this.DependencyRepositoryModel.updateMany(
    //         {},
    //         {
    //             $set: { isDeleted: false },
    //         },
    //     );
    // }

    async getLicensesWithDependencyCount(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }

        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }

        const repository = await this.getRepositoryByUserId(userId, repoId);

        if (!repository) {
            throw new NotFoundException('Repository not found.');
        }

        // Aggregation pipeline to get licenses with dependency count
        const pipeline = [
            {
                $match: {
                    repositoryId: new Types.ObjectId(repoId),
                    installedVersion: { $ne: null },
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'dependencies',
                    localField: 'dependencyId',
                    foreignField: '_id',
                    as: 'dependency',
                },
            },
            {
                $unwind: '$dependency',
            },
            {
                $lookup: {
                    from: 'licenses',
                    localField: 'dependency.license',
                    foreignField: 'licenseId',
                    as: 'licenseDetails',
                },
            },
            {
                $unwind: {
                    path: '$licenseDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: '$dependency.license',
                    dependencyCount: { $sum: 1 },
                    licenseRisk: {
                        $first: '$licenseDetails.useCase.licenseRisk',
                    },
                    licenseFamily: {
                        $first: '$licenseDetails.useCase.licenseFamily',
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    license: '$_id',
                    dependencyCount: 1,
                    licenseRisk: { $ifNull: ['$licenseRisk', null] },
                    licenseFamily: { $ifNull: ['$licenseFamily', null] },
                },
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }], // Get the total count of groups
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                },
            },
        ];

        const result = await this.DependencyRepositoryModel.aggregate(pipeline);
        const data = result[0].data;
        const totalCount =
            result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;

        return { data, totalCount };
    }
}
