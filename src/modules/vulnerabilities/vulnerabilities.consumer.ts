import {
  Processor,
  OnWorkerEvent,
  OnQueueEvent,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Processor('vulnerabilities', {
  concurrency: 2,
  limiter: {
    max: 5, // Allow max 5 jobs
    duration: 1000, // Per 1000ms (1 second)
  },
})
export class VulnerabilityConsumer extends WorkerHost {
  private readonly logger = new Logger(VulnerabilityConsumer.name);

  constructor(private readonly vulnerabilitiesService: VulnerabilitiesService) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnQueueEvent('active')
  onEventActive(job: { jobId: string; prev?: string }) {
    this.logger.log(`Processing job ${job.jobId}...`);
  }

  @OnQueueEvent('waiting')
  onWaiting(jobId: string) {
    this.logger.log(`Job ${jobId} is waiting to be processed.`);
  }

  @OnQueueEvent('delayed')
  onDelayed(job: Job) {
    this.logger.log(`Job ${job.id} is delayed.`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed!`);
  }

  async process(job: Job<any>) {
    // Job processing logic here
    try {
      this.logger.log(`Processing ${job.name} job with data`);
      switch (job.name) {
        case 'get-vulnerability-info':
          await this.vulnerabilitiesService.getVulnerabilityInfoFromOSV(
            job.data.dependencyName,
            job.data.ecosystem,
          );
          break;
        case 'get-cve-info':
          await this.vulnerabilitiesService.getCVEInfoFromNVD(
            job.data.dependency,
            job.data.vuln.cveId,
            job.data.vuln,
          );
          break;
        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Error processing job ${job.name}: ${error.message}`);
    }
  }
}
