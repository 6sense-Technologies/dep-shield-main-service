import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryLangAnalysisService } from './repository-lang-analysis.service';

describe('RepositoryLangAnalysisService', () => {
  let service: RepositoryLangAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryLangAnalysisService],
    }).compile();

    service = module.get<RepositoryLangAnalysisService>(RepositoryLangAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
