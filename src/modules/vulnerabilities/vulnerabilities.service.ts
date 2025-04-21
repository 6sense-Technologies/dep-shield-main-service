import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
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

@Injectable()
export class VulnerabilitiesService {
    private readonly logger = new Logger(VulnerabilitiesService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly dependenciesService: DependenciesService,
        private readonly repositoryService: RepositoryService,
        @InjectQueue('vulnerabilities') private vulnerabilityQueue: Queue,
        @InjectModel(Vulnerability.name)
        private vulnerabilityModel: Model<VulnerabilityDocument>,
        @InjectModel(VulnerabilityVersion.name)
        private vulnerabilityVersionModel: Model<VulnerabilityVersionDocument>,
    ) {}

    async create(createVulnerabilityDTO: any) {
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
    }

    async getByCVEId(cveId: string) {
        return await this.vulnerabilityModel
            .findOne({
                cveId,
            })
            .populate('dependencyId');
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

    async getCVEInfoFromNVD(dependencyId: string, cveId: string, vuln: any) {
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

            const savedVuln = await this.vulnerabilityModel.findOneAndUpdate(
                { id: vuln.id },
                { $set: vulnData },
                { upsert: true, new: true },
            );

            this.logger.log(`Finished processing CVE ${cveId}`);
        } catch (error) {
            this.logger.error(
                `Error processing NVD CVE: ${error.message}`,
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
                `Error processing OSV vulnerabilities: ${error.message}`,
                error.stack,
            );
        }
    }

    async createVulnerability(userId: string, repoId: string) {
        const repository = await this.repositoryService.getRepositoryByUserId(
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

        for (const dep of dependencies) {
            if (dep.dependencyId) {
                await this.getVulnerabilityInfoFromOSV(
                    dep.dependencyId?.['dependencyName'],
                    'npm',
                );
            }
        }
        return dependencies;
    }

    async getVulnerabilityInfoFromOSV(
        dependencyName: string,
        ecosystem: string,
    ) {
        try {
            this.logger.log(`Fetching OSV data for ${dependencyName}...`);
            const response = await firstValueFrom(
                this.httpService.post(`https://api.osv.dev/v1/query`, {
                    package: { name: dependencyName, ecosystem },
                }),
            );

            if (!response.data) {
                this.logger.error(`Empty response for ${dependencyName}`);
                return;
            }

            const vulns = this.parseOSVData(response.data);
            if (vulns.length === 0) {
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
            if (!dependency) {
                this.logger.warn(
                    `Dependency ${dependencyName} not found in DB`,
                );
                return;
            }

            await Promise.all(
                vulns.map(async (vuln) =>
                    this.processVulnerability(dependency, vuln),
                ),
            );

            this.logger.log(
                `Finished processing vulnerabilities for ${dependencyName}`,
            );
        } catch (error) {
            this.logger.error(
                `Error processing OSV vulnerabilities: ${error.message}`,
                error.stack,
            );
        }
    }

    async processVulnerability(dependency, vuln) {
        await this.vulnerabilityQueue.add(
            'get-cve-info',
            { dependency: dependency._id, vuln },
            {
                delay: 20000,
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Increase delay for each retry
                },
                removeOnComplete: true,
            },
        );

        const vulnData = {
            dependencyId: dependency._id,
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
                this.processAffectedVersions(dependency, savedVuln, affected),
            ),
        );
    }

    async processAffectedVersions(dependency, savedVuln, affected) {
        const introducedVersion =
            await this.dependenciesService.getVersionByDepVersion(
                dependency._id,
                affected.ranges.introduced,
            );
        const fixedVersion =
            await this.dependenciesService.getVersionByDepVersion(
                dependency._id,
                affected.ranges.fixed,
            );

        if (introducedVersion && fixedVersion) {
            this.logger.log(
                `Found versions ${introducedVersion.version} to ${fixedVersion.version} for ${savedVuln.id}`,
            );

            // const notFixedVersions =
            //   await this.dependenciesService.getVersionsInPublishRange(
            //     dependency._id,
            //     introducedVersion.publishDate,
            //     fixedVersion.publishDate,
            //   );

            const bulkOps = [
                {
                    updateOne: {
                        filter: {
                            dependencyId: dependency._id,
                            vulnerability: savedVuln._id,
                            dependencyVersion: introducedVersion._id,
                            status: 'introduced',
                        },
                        update: { $set: { source: affected.source } },
                        upsert: true,
                    },
                },
                // ...notFixedVersions.map((v) => ({
                //   updateOne: {
                //     filter: {
                //       dependencyId: dependency._id,
                //       vulnerability: savedVuln._id,
                //       dependencyVersion: v._id,
                //       status: 'not-fixed',
                //     },
                //     update: { $set: { source: affected.source } },
                //     upsert: true,
                //   },
                // })),
                {
                    updateOne: {
                        filter: {
                            dependencyId: dependency._id,
                            vulnerability: savedVuln._id,
                            dependencyVersion: fixedVersion._id,
                            status: 'fixed',
                        },
                        update: { $set: { source: affected.source } },
                        upsert: true,
                    },
                },
            ];

            await this.vulnerabilityVersionModel.bulkWrite(bulkOps);
        }
    }
}
