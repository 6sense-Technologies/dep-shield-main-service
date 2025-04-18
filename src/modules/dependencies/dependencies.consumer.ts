import {
    Processor,
    OnWorkerEvent,
    OnQueueEvent,
    WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DependenciesService } from './dependencies.service';

@Processor('dependency', {
    concurrency: 2,
    limiter: {
        max: 5, // Allow max 5 jobs
        duration: 1000, // Per 1000ms (1 second)
    },
})
export class DependencyConsumer extends WorkerHost {
    private readonly logger = new Logger(DependencyConsumer.name);

    constructor(private readonly dependenciesService: DependenciesService) {
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
        switch (job.name) {
            case 'get-dependency-info':
                this.dependenciesService.getDependencyInfo(job.data);
                break;
            default:
                break;
        }
        // this.logger.log(`Processing ${job.name} job with data:`, job.data);
    }
}
