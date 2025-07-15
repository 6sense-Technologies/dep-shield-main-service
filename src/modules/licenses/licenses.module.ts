import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DependencyRepositorySchemaModule } from 'src/database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { OTPSecretSchemaModule } from 'src/database/otpsecret-schema/otp-secret-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { SharedRepositorySchemaModule } from 'src/database/shared-repository-schema/shared-repository-schema.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { LicenseSchemaModule } from '../../database/license-schema/license-schema.module';
import { DependenciesService } from '../dependencies/dependencies.service';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';
import { VulnerabilitiesModule } from '../vulnerabilities/vulnerabilities.module';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
    imports: [
        LicenseSchemaModule,
        UserSchemaModule,
        RepositorySchemaModule,
        GithubAppSchemaModule,
        DependencyRepositorySchemaModule,
        HttpModule,
        DependencySchemaModule,
        BullModule.registerQueue({
            name: 'dependency',
        }),
        VulnerabilitiesModule,
        SharedRepositorySchemaModule,
        EmailModule,
        OTPSecretSchemaModule,
    ],
    controllers: [LicensesController],
    providers: [
        LicensesService,
        RepositoryService,
        GithubAppService,
        DependenciesService,
        EmailService,
    ],
})
export class LicensesModule {}
