import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { RepositoryService } from './repository.service';
import { SchemasModule } from 'src/schemas/schemas.module';
import { RepositoryController } from './repository.controller';

@Module({
  imports: [HttpModule, SchemasModule], // Add HttpModule to imports
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService], // Export GithubService if it will be used in other modules
})
export class GithubModule {}
