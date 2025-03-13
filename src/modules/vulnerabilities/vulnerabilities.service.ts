import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { CreateVulnerabilityDTO } from './dto/create-vulnerability.dto';
import { DependenciesService } from '../dependencies/dependencies.service';
import {
  Vulnerability,
  VulnerabilityDocument,
} from 'src/database/vulnerability-schema/vulnerability.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VulnerabilityVersion,
  VulnerabilityVersionDocument,
} from 'src/database/vulnerability-schema/vulnerability-version.schema';

@Injectable()
export class VulnerabilitiesService {
  private readonly logger = new Logger(VulnerabilitiesService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly dependenciesService: DependenciesService,
    @InjectQueue('vulnerabilities') private vulnerabilityQueue: Queue,
    @InjectModel(Vulnerability.name)
    private vulnerabilityModel: Model<VulnerabilityDocument>,
    @InjectModel(VulnerabilityVersion.name)
    private vulnerabilityVersionModel: Model<VulnerabilityVersionDocument>,
  ) {}

  async create(createVulnerabilityDTO: CreateVulnerabilityDTO) {
    await this.vulnerabilityQueue.add(
      'get-vulnerability-info',
      createVulnerabilityDTO,
    );
  }

  parseOSVData(data: any) {
    return data.vulns.map((vuln) => ({
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
                range.events?.find((event) => event.introduced)?.introduced ||
                '',
              fixed: range.events?.find((event) => event.fixed)?.fixed || '',
            }))[0] || {}, // Pick first range if multiple exist
        })) || [],
    }));
  }

  async getVulnerabilityInfo(dependencyName: string, ecosystem: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`https://api.osv.dev/v1/query`, {
          package: { name: dependencyName, ecosystem: ecosystem },
        }),
      );

      if (!response.data) {
        this.logger.error(`Empty response for ${dependencyName}`);
        return;
      }

      const vulns = this.parseOSVData(response.data);
      if (vulns.length === 0) {
        this.logger.log(`No vulnerabilities found for ${dependencyName}`);
        return;
      }

      this.logger.log(
        `Found ${vulns.length} vulnerabilities for ${dependencyName}`,
      );

      // Fetch dependency details once
      const dependency =
        await this.dependenciesService.getDetailsByDependencyName(
          dependencyName,
        );
      if (!dependency) {
        this.logger.warn(`Dependency ${dependencyName} not found in DB`);
        return;
      }

      // Process vulnerabilities in parallel
      await Promise.all(
        vulns.map(async (vuln) => {
          const savedVuln = await this.vulnerabilityModel.findOneAndUpdate(
            { id: vuln.id },
            {
              $set: {
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
              },
            },
            { upsert: true, new: true },
          );

          this.logger.log(
            `Processing ${vuln.affected.length} affected versions for ${vuln.id}`,
          );

          // Process affected versions in parallel
          await Promise.all(
            vuln.affected.map(async (affected) => {
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
                  `Found introduced ${introducedVersion.version} and fixed ${fixedVersion.version} for ${vuln.id}`,
                );

                const notFixedVersions =
                  await this.dependenciesService.getVersionsInPublishRange(
                    dependency._id,
                    introducedVersion.publishDate,
                    fixedVersion.publishDate,
                  );

                // Prepare bulk write operations for vulnerability versions
                const bulkOperations = [
                  {
                    updateOne: {
                      filter: {
                        dependencyId: dependency._id,
                        vulnerability: savedVuln._id,
                        dependencyVersion: introducedVersion._id,
                        status: 'introduced',
                      },
                      update: {
                        $set: {
                          dependencyId: dependency._id,
                          vulnerability: savedVuln._id,
                          dependencyVersion: introducedVersion._id,
                          status: 'introduced',
                          source: affected.source,
                        },
                      },
                      upsert: true,
                    },
                  },
                  ...notFixedVersions.map((version) => ({
                    updateOne: {
                      filter: {
                        dependencyId: dependency._id,
                        vulnerability: savedVuln._id,
                        dependencyVersion: version._id,
                        status: 'not-fixed',
                      },
                      update: {
                        $set: {
                          dependencyId: dependency._id,
                          vulnerability: savedVuln._id,
                          dependencyVersion: version._id,
                          status: 'not-fixed',
                          source: affected.source,
                        },
                      },
                      upsert: true,
                    },
                  })),
                  {
                    updateOne: {
                      filter: {
                        dependencyId: dependency._id,
                        vulnerability: savedVuln._id,
                        dependencyVersion: fixedVersion._id,
                        status: 'fixed',
                      },
                      update: {
                        $set: {
                          dependencyId: dependency._id,
                          vulnerability: savedVuln._id,
                          dependencyVersion: fixedVersion._id,
                          status: 'fixed',
                          source: affected.source,
                        },
                      },
                      upsert: true,
                    },
                  },
                ];

                // Execute bulk write operation
                await this.vulnerabilityVersionModel.bulkWrite(bulkOperations);
              }
            }),
          );
        }),
      );

      this.logger.log(
        `Finished processing vulnerabilities for ${dependencyName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing vulnerabilities: ${error.message}`,
        error.stack,
      );
    }
  }
}
