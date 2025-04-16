import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DependencyRepositorySchemaModule } from 'src/database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { VulnerabilitySchemaModule } from 'src/database/vulnerability-schema/vulnerability-schema.module';
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
    ],
    controllers: [VulnerabilitiesController],
    providers: [
        VulnerabilitiesService,
        VulnerabilityConsumer,
        DependenciesService,
        RepositoryService,
        GithubAppService,
    ],
})
export class VulnerabilitiesModule {}
