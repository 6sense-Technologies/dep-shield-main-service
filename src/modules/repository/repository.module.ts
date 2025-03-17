import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { RepositoryService } from './repository.service';

import { RepositoryController } from './repository.controller';
import { GithubAppModule } from '../github-app/github-app.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';
import { RepositorySchemaModule } from 'src/database/repository-schema/repository-schema.module';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';

@Module({
  imports: [
    HttpModule,
    GithubAppSchemaModule,
    UserSchemaModule,
    RepositorySchemaModule,
    GithubAppModule,
  ], // Add HttpModule to imports
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService], // Export GithubService if it will be used in other modules
})
export class RepositoryModule {}
