import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { isValidObjectId, Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
    DependencyVersion,
    DependencyVersionDocument,
} from '../../database/dependency-schema/dependency-version.schema';
import {
    Dependency,
    DependencyDocument,
} from '../../database/dependency-schema/dependency.schema';
import { RepositoryService } from '../repository/repository.service';
import { CreateDependencyDTO } from './dto/create-dependency.dto';

@Injectable()
export class DependenciesService {
    constructor(
        private readonly httpService: HttpService,
        @Inject(forwardRef(() => RepositoryService))
        private readonly repositoryService: RepositoryService,
        @InjectModel(Dependency.name)
        private dependencyModel: Model<DependencyDocument>,
        @InjectModel(DependencyVersion.name)
        private dependencyVersionModel: Model<DependencyVersionDocument>,
        @InjectQueue('dependency') private dependencyQueue: Queue,
    ) {}

    async create(createDependencyDTO: CreateDependencyDTO, version?: string) {
        const dep = await this.dependencyModel
            .findOneAndUpdate(
                createDependencyDTO,
                { $setOnInsert: createDependencyDTO },
                {
                    upsert: true,
                    new: true,
                },
            )
            .lean();

        await this.dependencyQueue.add(
            'get-dependency-info',
            { dep, version },
            {
                delay: 1000,
                attempts: 2,
                removeOnComplete: true,
            },
        );

        return dep;
    }

    async findOne(dependencyId: string) {
        if (isValidObjectId(dependencyId) === false) {
            throw new NotFoundException(
                `Invalid dependency id: ${dependencyId}`,
            );
        }
        const dep = await this.dependencyModel
            .findOne({
                _id: new Types.ObjectId(dependencyId),
            })
            .lean();
        return dep;
    }

    async findDependencyByName(dependencyName: string) {
        return await this.dependencyModel
            .findOne({
                dependencyName: dependencyName,
            })
            .lean();
    }

    async getDependenciesWithVulnerabilityCount(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }

        const result =
            await this.repositoryService.getDependenciesWithVulnerabilityCount(
                userId,
                repoId,
                page,
                limit,
            );

        const data = result[0].data;
        const count =
            result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;

        return { data, count };
    }

    async getDetailsByDependencyName(dependencyName: string) {
        const dep = await this.dependencyModel.aggregate([
            {
                $match: {
                    dependencyName: dependencyName,
                },
            },
        ]);
        if (dep.length > 0) {
            return dep[0];
        }
        return null;
    }

    async getVersionByDepVersion(dependencyId: string, version: string) {
        return await this.dependencyVersionModel
            .findOne({
                dependencyId: new Types.ObjectId(dependencyId),
                version: version,
            })
            .lean();
    }

    async getVersionsInPublishRange(
        dependencyId: string,
        introducedVersionDate: Date,
        fixedVersionDate: Date,
    ) {
        return await this.dependencyVersionModel
            .find({
                dependencyId: new Types.ObjectId(dependencyId),
                publishDate: {
                    $gt: introducedVersionDate,
                    $lt: fixedVersionDate,
                },
            })
            .lean();
    }

    async getDependencyById(dependencyId: string) {
        if (isValidObjectId(dependencyId) === false) {
            throw new BadRequestException('Invalid dependency ID');
        }

        const license = await this.dependencyModel.findById(
            new Types.ObjectId(dependencyId),
        );

        return license;
    }

    parseNPMRegistryData(data: any) {
        return {
            dependencyName: data.name || '',
            description: data.description || '',
            versions: Object.keys(data.versions || {}).map((version) => ({
                version: version,
                versionId: data.versions[version]._id || '',
                publishDate: data.time ? data.time[version] || '' : '',
            })),
            license: data.license || '',
            homepage: data.homepage || '',
            repository: data.repository.url || '',
            maintainers: data.maintainers || [],
            currentVersion: data['dist-tags']?.latest || '',
            lastPublishDate: data.time[data['dist-tags']?.latest] || '',
        };
    }

    parseNPMSData(data: any) {
        return {
            description: data['collected']['metadata']['description'] || '',
            license: data['collected']['metadata']['license'] || '',
            homepage: data['collected']['metadata']['links']['homepage'] || '',
            npm: data['collected']['metadata']['links']['npm'] || '',
            repository:
                data['collected']['metadata']['links']['repository'] || '',
            evaluation: data['evaluation'] || {},
            score: data['score'] || {},
        };
    }

    async getDependencyInfo({
        dep,
        version,
    }: {
        dep: DependencyDocument;
        version: string;
    }) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `https://registry.npmjs.org/${dep.dependencyName}`,
                ),
            );

            const npmsResponse = await firstValueFrom(
                this.httpService.get(
                    `https://api.npms.io/v2/package/${encodeURIComponent(dep.dependencyName)}`,
                ),
            );
            let updatedData = {};
            if (response.data) {
                const data = this.parseNPMRegistryData(response.data);
                data.versions.forEach(async (version) => {
                    await this.dependencyVersionModel.updateOne(
                        { versionId: version.versionId, dependencyId: dep._id },
                        {
                            $set: {
                                version: version.version,
                                versionId: version.versionId,
                                publishDate: version.publishDate,
                            },
                        },
                        { upsert: true },
                    );
                });

                updatedData = {
                    ...updatedData,
                    ...{
                        description: data.description,
                        license: data.license,
                        homepage: data.homepage,
                        repository: data.repository,
                        maintainers: data.maintainers,
                        currentVersion: data.currentVersion,
                        lastPublishDate: data.lastPublishDate,
                    },
                };
            }

            if (npmsResponse.data) {
                const data = this.parseNPMSData(npmsResponse.data);
                updatedData = {
                    ...updatedData,
                    ...{
                        description: data.description,
                        homepage:
                            data.homepage || updatedData['homepage'] || '',
                        npm: data.npm || '',
                        repository:
                            data.repository || updatedData['repository'] || '',
                        license: data.license,
                        evaluation: data.evaluation,
                        score: data.score,
                    },
                };
            }

            if (updatedData) {
                await this.dependencyModel.updateOne(
                    { dependencyName: dep.dependencyName },
                    { $set: updatedData },
                );
            }
            this.repositoryService.addVulnerability(
                dep.dependencyName,
                dep._id as string,
                version,
            );
        } catch (error) {
            console.error(
                `Error fetching dependency info for ${dep.dependencyName}:`,
                error.message,
            );
        }
    }
}
