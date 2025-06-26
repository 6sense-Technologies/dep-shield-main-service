import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DependencyRepositorySchemaModule } from 'src/database/dependency-repository-schema/dependency-repository-schema.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { LicenseSchemaModule } from '../../database/license-schema/license-schema.module';
import { DependenciesService } from '../dependencies/dependencies.service';
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
    ],
    controllers: [LicensesController],
    providers: [
        LicensesService,
        RepositoryService,
        GithubAppService,
        DependenciesService,
    ],
})
export class LicensesModule {}
