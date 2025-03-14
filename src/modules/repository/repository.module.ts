import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { RepositoryService } from './repository.service';

import { RepositoryController } from './repository.controller';
import { GithubAppModule } from '../github-app/github-app.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { DependencyRepositorySchemaModule } from 'src/database/dependency-repository-schema/dependency-repository-schema.module';
import { DependenciesModule } from '../dependencies/dependencies.module';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
@Module({
  imports: [
    HttpModule,
    GithubAppSchemaModule,
    UserSchemaModule,
    RepositorySchemaModule,
    DependencyRepositorySchemaModule,
    DependenciesModule,
    GithubAppModule,
  ], // Add HttpModule to imports
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService], // Export GithubService if it will be used in other modules
})
export class GithubModule {}
