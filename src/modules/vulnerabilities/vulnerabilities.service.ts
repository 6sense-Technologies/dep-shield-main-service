import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
    VulnerabilityVersion,
    VulnerabilityVersionDocument,
} from '../../database/vulnerability-schema/vulnerability-version.schema';
import {
    Vulnerability,
    VulnerabilityDocument,
} from '../../database/vulnerability-schema/vulnerability.schema';
import { DependenciesService } from '../dependencies/dependencies.service';
import { RepositoryService } from '../repository/repository.service';
import { CreateVulnerabilityDTO } from './dto/create-vulnerability.dto';

@Injectable()
export class VulnerabilitiesService {
    private readonly logger = new Logger(VulnerabilitiesService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly dependenciesService: DependenciesService,
        @Inject(forwardRef(() => RepositoryService))
        private readonly repositoryService: RepositoryService,
        @InjectQueue('vulnerabilities') private vulnerabilityQueue: Queue,
        @InjectModel(Vulnerability.name)
        private vulnerabilityModel: Model<VulnerabilityDocument>,
        @InjectModel(VulnerabilityVersion.name)
        private vulnerabilityVersionModel: Model<VulnerabilityVersionDocument>,
    ) {}

    async create(createVulnerabilityDTO: CreateVulnerabilityDTO) {
        try {
            await this.vulnerabilityQueue.add(
                'get-vulnerability-info',
                createVulnerabilityDTO,
                {
                    delay: 1000,
                    attempts: 2,
                    removeOnComplete: true,
                    // repeat: { every: 24 * 60 * 60 * 1000 },
                },
            );
        } catch (error) {
            this.logger.error(
                `Error creating vulnerability: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to create vulnerability',
            );
        }
    }

    async getVulnerabilities(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }

        try {
            const result = await this.repositoryService.getVulnerabilities(
                userId,
                repoId,
                page,
                limit,
            );

            const data = result[0]?.data || [];
            const count =
                result[0]?.metadata?.length > 0
                    ? result[0].metadata[0].total
                    : 0;

            return { data, count };
        } catch (error) {
            this.logger.error(
                `Error getting vulnerabilities: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve vulnerabilities',
            );
        }
    }

    async getVulnerabilityByDependencyId(
        dependencyId: string,
        dependencyVersionId: string,
    ) {
        try {
            return await this.vulnerabilityModel
                .findOne({
                    dependencyId: new Types.ObjectId(dependencyId),
                    dependencyVersionId: new Types.ObjectId(
                        dependencyVersionId,
                    ),
                })
                .lean();
        } catch (error) {
            this.logger.error(
                `Error getting vulnerability by dependency ID: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve vulnerability',
            );
        }
    }

    async getByCVEId(cveId: string) {
        try {
            return await this.vulnerabilityModel
                .findOne({
                    cveId,
                })
                .populate('dependencyId');
        } catch (error) {
            this.logger.error(
                `Error getting vulnerability by CVE ID: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve vulnerability by CVE ID',
            );
        }
    }

    parseNvdResponse(nvdData) {
        if (!nvdData?.vulnerabilities || nvdData.vulnerabilities.length === 0) {
            return { error: 'No vulnerabilities found in the response' };
        }

        const cveData = nvdData.vulnerabilities[0]?.cve; // Assuming only one vulnerability
        if (!cveData) return { error: 'Invalid CVE structure' };

        return {
            nvdVulnStatus: cveData.vulnStatus || '',
            nvdDescription:
                cveData.descriptions?.find((desc) => desc.lang === 'en')
                    ?.value || '',
            metrices: {
                cvssMetricV40:
                    cveData.metrics?.cvssMetricV40 &&
                    cveData.metrics?.cvssMetricV40.length > 0
                        ? cveData.metrics?.cvssMetricV40[0]
                        : null,
                cvssMetricV31:
                    cveData.metrics?.cvssMetricV31 &&
                    cveData.metrics?.cvssMetricV31.length > 0
                        ? cveData.metrics?.cvssMetricV31[0]
                        : null,
                cvssMetricV30:
                    cveData.metrics?.cvssMetricV30 &&
                    cveData.metrics?.cvssMetricV30.length > 0
                        ? cveData.metrics?.cvssMetricV30[0]
                        : null,
                cvssMetricV2:
                    cveData.metrics?.cvssMetricV2 &&
                    cveData.metrics?.cvssMetricV2.length > 0
                        ? cveData.metrics?.cvssMetricV2[0]
                        : null,
            },
            weaknesses:
                cveData.weaknesses?.map(
                    (weakness) => weakness.description?.[0]?.value,
                ) || [],
        };
    }

    parseOSVData(data: any) {
        return data.vulns?.map((vuln) => ({
            id: vuln.id,
            summary: vuln.summary,
            details: vuln.details,
            cveId: vuln.aliases?.[0] || '',
            published: vuln.published,
            cweId: vuln.database_specific?.cwe_ids || [],
            nvd_published_at: vuln.database_specific?.nvd_published_at || '',
            db_severity: vuln.database_specific?.severity || '',
            references: vuln.references?.map((ref) => ref.url) || [],
            CVSSseverity: vuln.severity || [],
            affected:
                vuln.affected?.map((aff) => ({
                    source: aff.database_specific?.source || '',
                    ranges:
                        aff.ranges?.map((range) => ({
                            introduced:
                                range.events?.find((event) => event.introduced)
                                    ?.introduced || '',
                            fixed:
                                range.events?.find((event) => event.fixed)
                                    ?.fixed || '',
                        }))[0] || {}, // Pick first range if multiple exist
                })) || [],
        }));
    }

    async getCVEInfoFromNVD(vuln: any) {
        const cveId = vuln.cveId;
        try {
            this.logger.log(`Fetching NVD data for ${cveId}...`);
            const response = await firstValueFrom(
                this.httpService.get(
                    `https://services.nvd.nist.gov/rest/json/cves/2.0`,
                    {
                        params: { cveId },
                        headers: {
                            apiKey: this.configService.get('NVD_API_KEY'),
                            Accept: 'application/json',
                        },
                        timeout: 10000,
                    },
                ),
            );

            if (!response.data) {
                this.logger.error(`Empty response for ${cveId}`);
                return;
            }

            const cveInfo = this.parseNvdResponse(response.data);
            if (!cveInfo || cveInfo.error) {
                this.logger.warn(`No valid data found for CVE: ${cveId}`);
                return;
            }
            let vulnData = {
                nvdVulnStatus: cveInfo.nvdVulnStatus,
                nvdDescription: cveInfo.nvdDescription,
                weaknesses: cveInfo.weaknesses,
                severity: cveInfo.metrices,
            };

            this.updateSeverityData(vulnData, vuln.CVSSseverity);

            await this.vulnerabilityModel.findOneAndUpdate(
                { id: vuln.id },
                { $set: vulnData },
                { upsert: true, new: true },
            );

            this.logger.log(`Finished processing CVE ${cveId}`);
        } catch (error) {
            this.logger.error(
                `Error processing NVD CVE ${cveId}: ${error.message}`,
                error.stack,
            );
        }
    }

    detectCVSSVersionFromScore(cvssVector) {
        const match = cvssVector.match(/^CVSS:(\d+\.\d+)/); // Extract version
        if (match) {
            const version = match[1];
            if (version === '3.0') {
                return 'CVSS 3.0';
            } else if (version === '3.1') {
                return 'CVSS 3.1';
            }
        }
        return 'Unknown CVSS Version';
    }

    updateSeverityData(vulnData, cvssSeverities) {
        if (cvssSeverities && cvssSeverities.length > 0) {
            for (const severity of cvssSeverities) {
                if (
                    !vulnData.severity.cvssMetricV40 &&
                    severity['type'] == 'CVSS_V4'
                ) {
                    vulnData.severity.cvssMetricV40 = {
                        source: '',
                        type: '',
                        cvssData: {
                            version: '4.0',
                            vectorString: severity['score'] || '',
                        },
                    };
                } else if (
                    !vulnData.severity.cvssMetricV31 &&
                    severity['type'] == 'CVSS_V3' &&
                    this.detectCVSSVersionFromScore(severity['score']) ===
                        'CVSS 3.1'
                ) {
                    vulnData.severity.cvssMetricV31 = {
                        source: '',
                        type: '',
                        cvssData: {
                            version: '3.1',
                            vectorString: severity['score'] || '',
                        },
                    };
                } else if (
                    !vulnData.severity.cvssMetricV30 &&
                    severity['type'] == 'CVSS_V3' &&
                    this.detectCVSSVersionFromScore(severity['score']) ===
                        'CVSS 3.0'
                ) {
                    vulnData.severity.cvssMetricV30 = {
                        source: '',
                        type: '',
                        cvssData: {
                            version: '3.0',
                            vectorString: severity['score'] || '',
                        },
                    };
                } else if (
                    !vulnData.severity.cvssMetricV2 &&
                    severity['type'] == 'CVSS_V2'
                ) {
                    vulnData.severity.cvssMetricV2 = {
                        source: '',
                        type: '',
                        cvssData: {
                            version: '2.0',
                            vectorString: severity['score'] || '',
                        },
                    };
                }
            }
        }
    }

    async getVulnerabilityDetails(vulnId: string) {
        try {
            const vulnerabilityPipeline = [
                {
                    $match: {
                        _id: new Types.ObjectId(vulnId),
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
                    $lookup: {
                        from: 'vulnerabilityversions',
                        localField: '_id',
                        foreignField: 'vulnerabilityId',
                        as: 'vulnerabilityVersions',
                    },
                },
                {
                    $unwind: {
                        path: '$vulnerabilityVersions',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'dependencyversions',
                        localField: 'vulnerabilityVersions.dependencyVersionId',
                        foreignField: '_id',
                        as: 'dependencyVersions',
                    },
                },
                {
                    $unwind: {
                        path: '$dependencyVersions',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        cveId: 1,
                        published: 1,
                        dependencyName: '$dependency.dependencyName',
                        nvdDescription: 1,
                        references: 1,
                        severity: 1,
                        'vulnerabilityVersions.status': 1,
                        'vulnerabilityVersions.version':
                            '$dependencyVersions.version',
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        cveId: { $first: '$cveId' },
                        published: { $first: '$published' },
                        dependencyName: { $first: '$dependencyName' },
                        nvdDescription: { $first: '$nvdDescription' },
                        references: { $first: '$references' },
                        severity: { $first: '$severity' },
                        vulnerabilityHistory: {
                            $push: '$vulnerabilityVersions',
                        },
                    },
                },
            ];

            const vulnerability = await this.vulnerabilityModel.aggregate(
                vulnerabilityPipeline,
            );

            return vulnerability?.[0];
        } catch (error) {
            this.logger.error(
                `Error getting vulnerability details: ${error.message}`,
                error.stack,
            );
            throw new InternalServerErrorException(
                'Failed to retrieve vulnerability details',
            );
        }
    }

    async getVulnerabilitiesFromOsv(
        dependencyName: string,
        version: string,
        ecosystem: string,
    ) {
        try {
            this.logger.log(`Fetching OSV data for ${dependencyName}...`);
            let response = await firstValueFrom(
                this.httpService.post(`https://api.osv.dev/v1/query`, {
                    package: { name: dependencyName, ecosystem },
                    version,
                }),
            );

            const vulnerabilities = response.data.vulns;
            while (response.data.next_page_token) {
                response = await firstValueFrom(
                    this.httpService.post(`https://api.osv.dev/v1/query`, {
                        package: { name: dependencyName, ecosystem },
                        version,
                        page_token: response.data.next_page_token,
                    }),
                );
                vulnerabilities.push(...response.data.vulns);
            }

            return vulnerabilities;
        } catch (error) {
            this.logger.error(
                `Error processing OSV vulnerabilities for ${dependencyName}: ${error.message}`,
                error.stack,
            );
            return [];
        }
    }

    async createVulnerability(userId: string, repoId: string) {
        try {
            const repository =
                await this.repositoryService.getRepositoryByUserId(
                    userId,
                    repoId,
                );

            if (!repository) {
                throw new NotFoundException('Repository not found.');
            }

            const dependencies =
                await this.repositoryService.getInstalledDependenciesByRepoId(
                    repoId,
                );

            for (const dep of dependencies.data) {
                if (dep.dependencyId) {
                    await this.getVulnerabilityInfoFromOSV(
                        dep.dependencyId?.['dependencyName'],
                        '', // demo version. will be replaced with actual version if needed.
                        'npm',
                    );
                }
            }
            return dependencies;
        } catch (error) {
            this.logger.error(
                `Error creating vulnerability: ${error.message}`,
                error.stack,
            );
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Failed to create vulnerability',
            );
        }
    }

    async getVulnerabilityInfoFromOSV(
        dependencyName: string,
        version: string,
        ecosystem: string,
    ) {
        try {
            this.logger.log(`Fetching OSV data for ${dependencyName}...`);
            const response = await firstValueFrom(
                this.httpService.post(`https://api.osv.dev/v1/query`, {
                    package: { name: dependencyName, ecosystem },
                    version,
                }),
            );

            if (!response.data) {
                this.logger.error(`Empty response for ${dependencyName}`);
                return;
            }

            const vulns = this.parseOSVData(response.data);
            if (!vulns?.length) {
                this.logger.log(
                    `No vulnerabilities found for ${dependencyName}`,
                );
                return;
            }

            this.logger.log(
                `Processing ${vulns.length} vulnerabilities for ${dependencyName}`,
            );

            const dependency =
                await this.dependenciesService.getDetailsByDependencyName(
                    dependencyName,
                );

            const dependencyVersion =
                await this.dependenciesService.getVersionByDepVersion(
                    dependency._id,
                    version,
                );

            if (!dependencyVersion) {
                this.logger.warn(
                    `Dependency version ${version} not found in DB`,
                );
                return;
            }

            if (!dependency) {
                this.logger.warn(
                    `Dependency ${dependencyName} not found in DB`,
                );
                return;
            }

            await Promise.all(
                vulns.map(async (vuln) =>
                    this.processVulnerability(
                        dependency._id,
                        dependencyVersion._id,
                        vuln,
                    ),
                ),
            );

            this.logger.log(
                `Finished processing vulnerabilities for ${dependencyName}`,
            );
        } catch (error) {
            this.logger.error(
                `Error processing OSV vulnerabilities for ${dependencyName}: ${error.message}`,
                error.stack,
            );
        }
    }

    async processVulnerability(dependencyId, dependencyVersionId, vuln) {
        try {
            await this.vulnerabilityQueue.add(
                'get-cve-info',
                {
                    vuln,
                },
                {
                    delay: 20000,
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: true,
                },
            );

            const vulnData = {
                dependencyId,
                dependencyVersionId,
                id: vuln.id,
                summary: vuln.summary,
                details: vuln.details,
                cveId: vuln.cveId,
                published: vuln.published,
                cweId: vuln.cweId,
                nvd_published_at: vuln.nvd_published_at,
                intensity: vuln.db_severity,
                references: vuln.references,
            };

            const savedVuln = await this.vulnerabilityModel.findOneAndUpdate(
                { id: vuln.id },
                { $set: vulnData },
                { upsert: true, new: true },
            );

            await Promise.all(
                vuln.affected.map((affected) =>
                    this.processAffectedVersions(
                        dependencyId,
                        savedVuln,
                        affected,
                    ),
                ),
            );
        } catch (error) {
            this.logger.error(
                `Error processing vulnerability: ${error.message}`,
                error.stack,
            );
        }
    }

    async processAffectedVersions(dependencyId, savedVuln, affected) {
        try {
            const introducedVersion =
                await this.dependenciesService.getVersionByDepVersion(
                    dependencyId,
                    affected.ranges.introduced,
                );
            const fixedVersion =
                await this.dependenciesService.getVersionByDepVersion(
                    dependencyId,
                    affected.ranges.fixed,
                );

            if (introducedVersion && fixedVersion) {
                this.logger.log(
                    `Found versions ${introducedVersion.version} to ${fixedVersion.version} for ${savedVuln.id}`,
                );

                const bulkOps = [
                    {
                        updateOne: {
                            filter: {
                                dependencyId,
                                vulnerabilityId: savedVuln._id,
                                dependencyVersionId: introducedVersion._id,
                                status: 'introduced',
                            },
                            update: { $set: { source: affected.source } },
                            upsert: true,
                        },
                    },
                    {
                        updateOne: {
                            filter: {
                                dependencyId,
                                vulnerabilityId: savedVuln._id,
                                dependencyVersionId: fixedVersion._id,
                                status: 'fixed',
                            },
                            update: { $set: { source: affected.source } },
                            upsert: true,
                        },
                    },
                ];

                await this.vulnerabilityVersionModel.bulkWrite(bulkOps);
            }
        } catch (error) {
            this.logger.error(
                `Error processing affected versions: ${error.message}`,
                error.stack,
            );
        }
    }
}
