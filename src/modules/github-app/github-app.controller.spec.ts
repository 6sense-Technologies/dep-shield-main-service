import { Test, TestingModule } from '@nestjs/testing';
import { GithubAppController } from './github-app.controller';

describe('GithubAppController', () => {
  let controller: GithubAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubAppController],
    }).compile();

    controller = module.get<GithubAppController>(GithubAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
