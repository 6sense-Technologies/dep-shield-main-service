import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule
import { GithubService } from './github.service';
import { SchemasModule } from 'src/schemas/schemas.module';
import { GithubController } from './github.controller';

@Module({
  imports: [HttpModule, SchemasModule], // Add HttpModule to imports
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService], // Export GithubService if it will be used in other modules
})
export class GithubModule {}
