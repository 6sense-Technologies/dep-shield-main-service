import { Module } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { VulnerabilityConsumer } from './vulnerabilities.consumer';
import { VulnerabilitySchemaModule } from 'src/database/vulnerability-schema/vulnerability-schema.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { DependenciesService } from '../dependencies/dependencies.service';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'vulnerabilities',
    }),
    BullModule.registerQueue({
      name: 'dependency',
    }),
    DependencySchemaModule,
    VulnerabilitySchemaModule,
  ],
  controllers: [VulnerabilitiesController],
  providers: [VulnerabilitiesService, VulnerabilityConsumer, DependenciesService],
})
export class VulnerabilitiesModule {}
