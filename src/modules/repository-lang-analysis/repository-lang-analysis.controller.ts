import { Controller, Get, Param } from '@nestjs/common';
import { RepositoryLangAnalysisService } from './repository-lang-analysis.service';

@Controller('repository-lang-analysis')
export class RepositoryLangAnalysisController {
  constructor(private readonly repositoryLangAnalysisService: RepositoryLangAnalysisService) {}

  @Get(':repository')
  async getRepositoryLanguage(@Param('repository') repository: string) {
    return this.repositoryLangAnalysisService.analyzeRepository(repository);
  }
}
