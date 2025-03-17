import { Module } from '@nestjs/common';
import { RepositoryLangAnalysisService } from './repository-lang-analysis.service';
import { HttpModule } from '@nestjs/axios';
import { GithubAppModule } from '../github-app/github-app.module';
import { RepositoryModule } from '../repository/repository.module';
import { RepositoryLangAnalysisController } from './repository-lang-analysis.controller';

@Module({
  imports: [HttpModule, GithubAppModule, RepositoryModule],
  providers: [RepositoryLangAnalysisService],
  controllers: [RepositoryLangAnalysisController],
})
export class RepositoryLangAnalysisModule {}
