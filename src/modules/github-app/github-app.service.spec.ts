import { Test, TestingModule } from '@nestjs/testing';
import { GithubAppService } from './github-app.service';

describe('GithubAppService', () => {
  let service: GithubAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubAppService],
    }).compile();

    service = module.get<GithubAppService>(GithubAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
