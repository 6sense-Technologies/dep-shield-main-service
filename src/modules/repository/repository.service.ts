import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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
import { VulnerabilitiesService } from '../vulnerabilities/vulnerabilities.service';
import { GetRepositoryDto } from './dto/getRepository.dto';
import { validatePagination } from './validator/pagination.validator';
@Injectable()
export class RepositoryService {
    constructor(
        private readonly httpService: HttpService,
        private readonly githubAppService: GithubAppService,
        private readonly dependencyService: DependenciesService,
        @Inject(forwardRef(() => VulnerabilitiesService))
        private readonly vulnerabilityService: VulnerabilitiesService,
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

    async testWebhook(webhook: any) {
        console.log(webhook);
        return webhook;
    }

    async scanRepoWebhook(webhook: IGitHubPushWebhook) {
        try {
            const repo = await this.RepositoryModel.findOne({
                repoUrl: webhook.repository.url, // will find by gitHub repository id later.
                isDeleted: false,
                isSelected: true,
            });
            if (!repo) {
                return { message: 'Repository not found' };
            }
            const branch = this.getBranchFromRef(webhook.ref);
            if (branch != repo.defaultBranch) {
                return { message: 'Branch is not default branch' };
            }
            const allModified = new Set();
            for (const commit of webhook.commits) {
                for (const file of commit.modified) {
                    allModified.add(file);
                }
            }
            if (allModified.has('package-lock.json')) {
                this.scanRepo(repo._id.toString());
                console.log('started scanning for repository:', repo._id);
                return { message: 'Repository scanning started...' };
            } else {
                return { message: 'No package-lock.json modified' };
            }
        } catch (error) {
            console.error('Error processing webhook:', error.message);
            return {
                message: 'Error processing webhook',
                error: error.message,
            };
        }
    }

    async getRepoDetails(repoId: string, userId: string) {
        const repo = await this.RepositoryModel.findOne({
            _id: repoId,
            isDeleted: false,
            user: new Types.ObjectId(userId),
        }).lean();

        if (!repo) {
            throw new NotFoundException('Repository not found');
        }
        return {
            repoName: repo.repoName,
            repoUrl: repo.repoUrl,
            defaultBranch: repo.defaultBranch,
            _id: repo._id,
        };
    }

    private getBranchFromRef(ref) {
        if (typeof ref !== 'string') return null;
        if (ref.startsWith('refs/heads/')) {
            return ref.replace('refs/heads/', '');
        }
        return null; // not a branch
    }

    private getRepositoriesPipeline(
        userId: string,
        query: GetRepositoryDto,
        onlySelected: boolean = false,
    ) {
        let pipeline = [];
        const { pageNum, limitNum } = validatePagination(
            query.page,
            query.limit,
        );
        const skipVal = (pageNum - 1) * limitNum;
        const matchConditions: any = {
            user: new Types.ObjectId(userId),
            isDeleted: false,
        };

        if (onlySelected) {
            matchConditions.isSelected = true;
        }
        pipeline.push(
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
        );

        if (query.dependencyId || query.license) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'dependencyrepositories',
                        localField: '_id',
                        foreignField: 'repositoryId',
                        as: 'dependencyRepo',
                    },
                },
                {
                    $unwind: {
                        path: '$dependencyRepo',
                        preserveNullAndEmptyArrays: false,
                    },
                },
            );

            if (query.dependencyId) {
                pipeline.push({
                    $match: {
                        'dependencyRepo.dependencyId': new Types.ObjectId(
                            query.dependencyId,
                        ),
                        'dependencyRepo.isDeleted': false,
                    },
                });
            }

            if (query.license) {
                pipeline.push(
                    {
                        $lookup: {
                            from: 'dependencies',
                            localField: 'dependencyRepo.dependencyId',
                            foreignField: '_id',
                            as: 'dependency',
                        },
                    },
                    {
                        $unwind: {
                            path: '$dependency',
                            preserveNullAndEmptyArrays: false,
                        },
                    },
                    {
                        $match: {
                            'dependency.license': query.license,
                            'dependencyRepo.isDeleted': false,
                        },
                    },
                );
            }
            pipeline.push(
                {
                    $group: {
                        _id: '$repoName',
                        repoId: { $first: '$_id' },
                    },
                },
                {
                    $project: {
                        _id: '$repoId',
                        repoName: '$_id',
                    },
                },
            );
        }

        pipeline.push({
            $facet: {
                repositories: [
                    { $skip: skipVal },
                    { $limit: limitNum },
                    {
                        $project: {
                            githubApp: 0,
                            dependencyRepo: 0,
                            dependency: 0,
                        },
                    },
                ],
                totalCount: [{ $count: 'count' }],
            },
        });

        return pipeline;
    }
    async getRepositories(userId: string, page: string, limit: string) {
        const user = await this.userModel.findById(userId).exec();
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
                                    Accept: 'application/vnd.github+json',
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
                                    repoUrl: repo.url, // will find by gitHub repository id later.
                                },
                                update: {
                                    $set: {
                                        user,
                                        gitHubRepoId: repo.id,
                                        repoName: repo.full_name,
                                        repoUrl: repo.url,
                                        htmlUrl: repo.html_url,
                                        repoDescription: repo.description,
                                        owner: repo.owner.login,
                                        ownerType: repo.owner.type,
                                        isPrivate: repo.private,
                                        // defaultBranch: repo.default_branch,
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
            const query: GetRepositoryDto = {
                page,
                limit,
            };
            const pipeline = this.getRepositoriesPipeline(userId, query);
            const repositories = await this.RepositoryModel.aggregate(pipeline);

            const repositoriesResult = repositories[0].repositories;
            const totalCountResult =
                repositories[0].totalCount.length > 0
                    ? repositories[0].totalCount[0].count
                    : 0;

            return {
                data: repositoriesResult,
                count: totalCountResult,
            };
        } catch (error) {
            console.error('Unexpected error in getAllRepos:', error.message);
        }
    }

    async getBranches(repoId: string, userId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }

        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false, user: new Types.ObjectId(userId) },
            { _id: 1, repoUrl: 1, githubApp: 1 },
        )
            .populate('githubApp')
            .lean();

        if (!repo) {
            throw new NotFoundException(
                `Repository not found or deleted: ${repoId}`,
            );
        }

        const accessToken = await this.githubAppService.createInstallationToken(
            repo.githubApp.installationId,
        );

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${repo.repoUrl}/branches`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                    params: {
                        per_page: 100,
                    },
                }),
            );

            const branches = response.data.map((branch) => ({
                name: branch.name,
            }));

            return { data: branches, count: branches.length };
        } catch (e) {
            console.log(e.message);
            throw new NotFoundException('Could not retrieve branches');
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
        const matches = path.match(/node_modules\/(@[^\/]+\/[^\/]+|[^\/]+)/g);
        return matches ? matches.pop().replace('node_modules/', '') : null;
    }

    async scanRepo(repoId: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        // Find the repository by ID and ensure it's not deleted
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1, repoUrl: 1, githubApp: 1, defaultBranch: 1 },
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
        let response;
        try {
            response = await firstValueFrom(
                this.httpService.get(
                    `${repo.repoUrl}/contents/package-lock.json`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                        params: {
                            ref: repo.defaultBranch,
                        },
                    },
                ),
            );
        } catch (error) {
            console.log(error);
            throw new NotFoundException('Could not retrieve package-lock.json');
        }

        let dependencyObj;
        try {
            const dependencyFile = response.data;
            const dependencyFileContentDecoded = atob(dependencyFile.content);
            dependencyObj = JSON.parse(dependencyFileContentDecoded);
        } catch (error) {
            console.log(error);
            throw new NotFoundException('Could not parse package-lock.json');
        }

        const allDependencies: [string, any][] = Object.entries(
            dependencyObj['packages'],
        );

        for (const [dependency, dependencyData] of allDependencies) {
            if (!dependency) continue;

            const packageName = this.getPackageName(dependency);
            const packageVersion = dependencyData.version;

            let installedDep =
                await this.dependencyService.findDependencyByName(packageName);

            if (!installedDep) {
                installedDep = await this.dependencyService.create({
                    dependencyName: packageName,
                });
            } else {
                this.addVulnerability(
                    packageName,
                    installedDep._id.toString() as string,
                    packageVersion,
                    'npm',
                );
            }

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
                    dependencyData.peerDependencies,
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

        return {
            message:
                'Dependencies scanned successfully. It will take some time to process',
        };
    }

    async addVulnerability(
        dependencyName: string,
        dependencyId: string,
        version: string,
        ecosystem: string = 'npm',
    ) {
        console.log(dependencyName, dependencyId, version);
        const dependencyVersion =
            await this.dependencyService.getVersionByDepVersion(
                dependencyId,
                version,
            );

        const vulnerability =
            await this.vulnerabilityService.getVulnerabilityByDependencyId(
                dependencyId.toString(),
                dependencyVersion._id.toString() as string,
            );

        if (!vulnerability) {
            this.vulnerabilityService.create({
                dependencyName,
                ecosystem,
                version,
            });
        }
    }

    async updateDefaultBranch(repoId: string, branchName: string) {
        if (isValidObjectId(repoId) === false) {
            throw new BadRequestException('Invalid repository ID');
        }
        // Find the repository by ID and ensure it's not deleted
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1, defaultBranch: 1 },
        );

        if (!repo) {
            throw new NotFoundException(
                `Repository not found or deleted: ${repoId}`,
            );
        }

        const updatedRepo = await this.RepositoryModel.findByIdAndUpdate(
            { _id: repoId },
            { $set: { defaultBranch: branchName } },
            { new: true },
        );
        this.scanRepo(repoId);
        return updatedRepo;
    }

    async removeDependencyReposByRepoId(repoId: string) {
        await this.DependencyRepositoryModel.updateMany(
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

        const webHooks = await this.getWebHooksByRepo(repo);
        let isWebHookAdded = false;
        if (webHooks.length) {
            for (const hook of webHooks) {
                if (
                    hook.config.url ===
                        'https://dep-shield-main-service.onrender.com/repositories/github-webhooks' &&
                    hook.type === 'Repository'
                ) {
                    isWebHookAdded = true;
                    break;
                }
            }
        }

        if (!isWebHookAdded) {
            this.createWebHook(repo);
        }

        const dependency = await this.DependencyRepositoryModel.findOne({
            repositoryId: new Types.ObjectId(repoId),
        }).lean();
        if (!dependency) {
            console.log('Starting scan for new repository:', repoId);
            this.scanRepo(repoId);
        } else {
            await this.addDependencyReposByRepoId(repoId);
        }

        return await this.RepositoryModel.findByIdAndUpdate(
            { _id: repoId },
            { $set: { isSelected: true } },
        );
    }

    async getHooks(repoId: string) {
        const repo = await this.RepositoryModel.findOne(
            { _id: repoId, isDeleted: false },
            { _id: 1, repoUrl: 1, githubApp: 1 },
        ).populate('githubApp');
        return await this.getWebHooksByRepo(repo);
    }

    async createWebHook(repo) {
        const accessToken = await this.githubAppService.createInstallationToken(
            repo.githubApp.installationId,
        );

        try {
            await firstValueFrom(
                this.httpService.post(
                    `${repo.repoUrl}/hooks`,
                    {
                        active: true, // Determines if notifications are sent when the webhook is triggered.
                        events: ['push'], // event that triggers the webhook
                        config: {
                            url: 'https://dep-shield-main-service.onrender.com/repositories/github-webhooks',
                            content_type: 'json', // webhook body payload format
                        },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    },
                ),
            );
            console.log('Webhook created successfully for repo:', repo._id);
        } catch (error) {
            console.error('Error creating webhook:', error.message);
        }
    }

    async getWebHooksByRepo(repo) {
        const accessToken = await this.githubAppService.createInstallationToken(
            repo.githubApp.installationId,
        );

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${repo.repoUrl}/hooks`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                }),
            );

            return response.data;
        } catch (error) {
            console.error('Error fetching webhooks:', error.message);
            return [];
        }
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
        return await this.RepositoryModel.findByIdAndUpdate(
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

    async selectedRepos(query: GetRepositoryDto, userId: string) {
        const user = await this.userModel.findById(userId).exec();

        if (!user) {
            throw new UnauthorizedException('User is not valid');
        }

        const pipeline = this.getRepositoriesPipeline(userId, query, true);
        const repositories = await this.RepositoryModel.aggregate(pipeline);

        const repositoriesResult = repositories[0].repositories;
        const totalCountResult =
            repositories[0].totalCount.length > 0
                ? repositories[0].totalCount[0].count
                : 0;

        return {
            data: repositoriesResult,
            count: totalCountResult,
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
                            Accept: 'application/vnd.github+json',
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
                                Accept: 'application/vnd.github+json',
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

    async getDependencyRepoById(depRepoId: string) {
        if (isValidObjectId(depRepoId) === false) {
            throw new BadRequestException('Invalid ID');
        }
        const dependencyRepo = await this.DependencyRepositoryModel.findOne({
            _id: new Types.ObjectId(depRepoId),
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

    async getDependenciesWithVulnerabilityCount(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        let repoIds = [];

        repoIds = await this.getRepoIds(repoId, userId);

        const pipeline = [
            {
                $match: {
                    repositoryId: {
                        $in: repoIds,
                    },
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
                $unwind: {
                    path: '$dependency',
                },
            },
            {
                $lookup: {
                    from: 'vulnerabilities',
                    localField: 'dependencyId',
                    foreignField: 'dependencyId',
                    as: 'vulnerability',
                },
            },
            {
                $unwind: {
                    path: '$vulnerability',
                    preserveNullAndEmptyArrays: true,
                },
            },
            // {
            //     $match: {
            //         $expr: {
            //             $eq: [
            //                 '$vulnerability.dependencyVersionId', // will fix later for version
            //                 '$installedVersion',
            //             ],
            //         },
            //     },
            // },
            {
                $group: {
                    _id: '$dependency.dependencyName',
                    vulnerabilityCount: { $sum: 1 },
                    license: {
                        $first: '$dependency.license',
                    },
                    popularity: {
                        $first: '$dependency.score.detail.popularity',
                    },
                    quality: { $first: '$dependency.score.detail.quality' },
                    dependencyId: { $first: '$dependency._id' },
                },
            },
            {
                $project: {
                    _id: '$dependencyId',
                    name: '$_id',
                    vulnerabilityCount: 1,
                    quality: { $ifNull: ['$quality', null] },
                    popularity: { $ifNull: ['$popularity', null] },
                    license: 1,
                },
            },
            {
                $sort: { name: 1 },
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }], // Get the total count of groups
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                },
            },
        ];

        return await this.DependencyRepositoryModel.aggregate(pipeline as any);
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

    async getVulnerabilities(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        let repoIds = [];
        repoIds = await this.getRepoIds(repoId, userId);

        const pipeline = [
            {
                $match: {
                    repositoryId: {
                        $in: repoIds,
                    },
                    installedVersion: { $ne: null },
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'vulnerabilities',
                    localField: 'dependencyId',
                    foreignField: 'dependencyId',
                    as: 'vulnerability',
                },
            },
            {
                $unwind: {
                    path: '$vulnerability',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'dependencyversions',
                    localField: 'installedVersion',
                    foreignField: 'version',
                    as: 'dependencyVersion',
                },
            },
            {
                $unwind: {
                    path: '$dependencyVersion',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    $expr: {
                        $eq: [
                            '$vulnerability.dependencyVersionId',
                            '$dependencyVersion._id',
                        ],
                    },
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
                $unwind: {
                    path: '$dependency',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    name: '$vulnerability.cveId',
                    discovered: '$vulnerability.published',
                    dependencyName: '$dependency.dependencyName',
                },
            },
            {
                $sort: {
                    name: 1,
                },
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }], // Get the total count of groups
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                },
            },
        ];

        return await this.DependencyRepositoryModel.aggregate(pipeline as any);
    }

    async getLicensesWithDependencyCount(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        let repoIds = [];

        repoIds = await this.getRepoIds(repoId, userId);

        // const repository = await this.getRepositoryByUserId(userId, repoId);

        // if (!repository) {
        //     throw new NotFoundException('Repository not found.');
        // }

        // Aggregation pipeline to get licenses with dependency count
        const pipeline = [
            {
                $match: {
                    repositoryId: {
                        $in: repoIds,
                    },
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
                    name: {
                        $first: '$licenseDetails.name',
                    },
                    licenseId: { $first: '$licenseDetails._id' },
                },
            },
            {
                $project: {
                    _id: '$licenseId',
                    license: '$_id',
                    dependencyCount: 1,
                    licenseRisk: { $ifNull: ['$licenseRisk', null] },
                    licenseFamily: { $ifNull: ['$licenseFamily', null] },
                    name: { $ifNull: ['$name', null] },
                },
            },
            {
                $sort: { name: 1 },
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }], // Get the total count of groups
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                },
            },
        ];

        return await this.DependencyRepositoryModel.aggregate(pipeline as any);
    }

    private async getRepoIds(repoId: string, userId: string) {
        let repoIds: Types.ObjectId[] = [];
        if (repoId) {
            if (isValidObjectId(repoId) === false) {
                throw new BadRequestException('Invalid repository ID');
            }
            repoIds = [new Types.ObjectId(repoId)];
        } else {
            const repos = await this.selectedRepos(
                { page: '1', limit: '100' },
                userId,
            );
            repoIds = repos.data.map((repo) => repo._id);
        }
        return repoIds;
    }
}
