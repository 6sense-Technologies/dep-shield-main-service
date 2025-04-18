import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DependencyRepositorySchemaModule } from 'src/database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';
import { DependencyConsumer } from './dependencies.consumer';
import { DependenciesController } from './dependencies.controller';
import { DependenciesService } from './dependencies.service';

@Module({
    imports: [
        HttpModule,
        DependencySchemaModule,
        BullModule.registerQueue({
            name: 'dependency',
        }),
        UserSchemaModule,
        RepositorySchemaModule,
        GithubAppSchemaModule,
        DependencyRepositorySchemaModule,
    ],
    controllers: [DependenciesController],
    providers: [
        DependenciesService,
        DependencyConsumer,
        RepositoryService,
        GithubAppService,
    ],
    exports: [DependenciesService],
})
export class DependenciesModule {}
