import { Test, TestingModule } from '@nestjs/testing';
import { DependenciesService } from './dependencies.service';

describe('DependenciesService', () => {
  let service: DependenciesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DependenciesService],
    }).compile();

    service = module.get<DependenciesService>(DependenciesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
