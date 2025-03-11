import { Test, TestingModule } from '@nestjs/testing';
import { DependenciesController } from './dependencies.controller';
import { DependenciesService } from './dependencies.service';

describe('DependenciesController', () => {
  let controller: DependenciesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DependenciesController],
      providers: [DependenciesService],
    }).compile();

    controller = module.get<DependenciesController>(DependenciesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
