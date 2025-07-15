import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OTPSecretSchemaModule } from 'src/database/otpsecret-schema/otp-secret-schema.module';
import { SharedRepositorySchemaModule } from 'src/database/shared-repository-schema/shared-repository-schema.module';
import { DependencyRepositorySchemaModule } from '../../database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from '../../database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from '../../database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from '../../database/repository-schema/repository-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';
import { VulnerabilitiesModule } from '../vulnerabilities/vulnerabilities.module';
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
        VulnerabilitiesModule,
        SharedRepositorySchemaModule,
        EmailModule,
        OTPSecretSchemaModule,
    ],
    controllers: [DependenciesController],
    providers: [
        DependenciesService,
        DependencyConsumer,
        RepositoryService,
        GithubAppService,
        EmailService,
    ],
    exports: [DependenciesService],
})
export class DependenciesModule {}
