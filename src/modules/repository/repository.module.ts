import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { Module } from '@nestjs/common';
import { RepositoryService } from './repository.service';

import { DependencyRepositorySchemaModule } from '../../database/dependency-repository-schema/dependency-repository-schema.module';
import { GithubAppSchemaModule } from '../../database/githubapp-schema/github-app-schema.module';
import { RepositorySchemaModule } from '../../database/repository-schema/repository-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { DependenciesModule } from '../dependencies/dependencies.module';
import { GithubAppModule } from '../github-app/github-app.module';
import { VulnerabilitiesModule } from '../vulnerabilities/vulnerabilities.module';
import { RepositoryController } from './repository.controller';
@Module({
    imports: [
        HttpModule,
        GithubAppSchemaModule,
        UserSchemaModule,
        RepositorySchemaModule,
        DependencyRepositorySchemaModule,
        DependenciesModule,
        GithubAppModule,
        VulnerabilitiesModule,
    ], // Add HttpModule to imports
    controllers: [RepositoryController],
    providers: [RepositoryService],
    exports: [RepositoryService], // Export GithubService if it will be used in other modules
})
export class RepositoryModule {}
