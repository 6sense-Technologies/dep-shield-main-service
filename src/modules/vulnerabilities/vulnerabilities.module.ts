import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SharedRepositorySchemaModule } from 'src/database/shared-repository-schema/shared-repository-schema.module';
import { DependencyRepositorySchemaModule } from '../../database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from '../../database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from '../../database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from '../../database/repository-schema/repository-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { VulnerabilitySchemaModule } from '../../database/vulnerability-schema/vulnerability-schema.module';
import { DependenciesService } from '../dependencies/dependencies.service';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';
import { VulnerabilityConsumer } from './vulnerabilities.consumer';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { VulnerabilitiesService } from './vulnerabilities.service';

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
        UserSchemaModule,
        RepositorySchemaModule,
        GithubAppSchemaModule,
        DependencySchemaModule,
        DependencyRepositorySchemaModule,
        SharedRepositorySchemaModule,
    ],
    controllers: [VulnerabilitiesController],
    providers: [
        VulnerabilitiesService,
        VulnerabilityConsumer,
        DependenciesService,
        RepositoryService,
        GithubAppService,
    ],
    exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
