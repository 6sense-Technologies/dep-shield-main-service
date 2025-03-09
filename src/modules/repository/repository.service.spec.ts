import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { GithubAppService } from '../github-app/github-app.service';
import { User, UserDocument } from '../../database/user-schema/user.schema';
import {
  Repository,
  RepositoryDocument,
} from '../../database/repository-schema/repository.schema';
import {
  GithubApp,
  GithubAppDocument,
} from '../../database/githubapp-schema/github-app.schema';
import { of } from 'rxjs';

describe('RepositoryService', () => {
  let service: RepositoryService;
  let httpService: HttpService;
  let githubAppService: GithubAppService;
  let userModel: Model<UserDocument>;
  let repositoryModel: Model<RepositoryDocument>;
  let githubAppModel: Model<GithubAppDocument>;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockGithubAppService = {
    createInstallationToken: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    exec: jest.fn(),
  };

  const mockRepositoryModel = {
    bulkWrite: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockGithubAppModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: GithubAppService,
          useValue: mockGithubAppService,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Repository.name),
          useValue: mockRepositoryModel,
        },
        {
          provide: getModelToken(GithubApp.name),
          useValue: mockGithubAppModel,
        },
      ],
    }).compile();

    service = module.get<RepositoryService>(RepositoryService);
    httpService = module.get<HttpService>(HttpService);
    githubAppService = module.get<GithubAppService>(GithubAppService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    repositoryModel = module.get<Model<RepositoryDocument>>(
      getModelToken(Repository.name),
    );
    githubAppModel = module.get<Model<GithubAppDocument>>(
      getModelToken(GithubApp.name),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRepos', () => {
    it('should throw UnauthorizedException when user is not found', async () => {
      console.log(httpService);
      console.log(githubAppService);
      console.log(userModel);
      console.log(repositoryModel);
      console.log(githubAppModel);
      const userId = '67cd0fd06f1797fd790db010';
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getAllRepos(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw BadRequestException when no GitHub app is installed', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      const mockUser = { id: userId };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockGithubAppModel.find.mockResolvedValue([]);

      await expect(service.getAllRepos(userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockGithubAppModel.find).toHaveBeenCalledWith({
        user: mockUser,
        isDeleted: false,
      });
    });

    it('should fetch and return repositories successfully', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      const mockUser = { id: userId };
      const mockGithubApp = { installationId: '12345' };
      const mockToken = 'mock-token';
      const mockRepos = [
        {
          url: 'https://api.github.com/repos/user/repo1',
          full_name: 'user/repo1',
          owner: { login: 'user', type: 'User' },
          private: false,
          default_branch: 'main',
          html_url: 'https://github.com/user/repo1',
          description: 'Test repo 1',
        },
        {
          url: 'https://api.github.com/repos/user/repo2',
          full_name: 'user/repo2',
          owner: { login: 'user', type: 'User' },
          private: true,
          default_branch: 'main',
          html_url: 'https://github.com/user/repo2',
          description: 'Test repo 2',
        },
      ];
      const mockAggregateResult = [
        {
          repositories: [{ id: 'repo1' }, { id: 'repo2' }],
          totalCount: [{ count: 2 }],
        },
      ];

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockGithubAppModel.find.mockResolvedValue([mockGithubApp]);
      mockGithubAppService.createInstallationToken.mockResolvedValue(mockToken);
      mockHttpService.get.mockReturnValue(
        of({
          data: { repositories: mockRepos },
          status: 200,
        }),
      );
      mockRepositoryModel.bulkWrite.mockResolvedValue({ acknowledged: true });
      mockRepositoryModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getAllRepos(userId);

      expect(mockGithubAppService.createInstallationToken).toHaveBeenCalledWith(
        mockGithubApp.installationId,
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/installation/repositories',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(mockRepositoryModel.bulkWrite).toHaveBeenCalled();
      expect(mockRepositoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        repositories: [{ id: 'repo1' }, { id: 'repo2' }],
        totalCount: 2,
      });
    });

    it('should handle errors during repository fetch', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      const mockUser = { id: userId };
      const mockGithubApp = { installationId: '12345' };
      const mockAggregateResult = [
        {
          repositories: [],
          totalCount: [],
        },
      ];

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockGithubAppModel.find.mockResolvedValue([mockGithubApp]);
      mockGithubAppService.createInstallationToken.mockResolvedValue(
        'mock-token',
      );
      mockHttpService.get.mockImplementation(() => {
        throw new Error('API Error');
      });
      mockRepositoryModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getAllRepos(userId);

      expect(mockGithubAppService.createInstallationToken).toHaveBeenCalledWith(
        mockGithubApp.installationId,
      );
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockRepositoryModel.bulkWrite).not.toHaveBeenCalled();
      expect(mockRepositoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        repositories: [],
        totalCount: 0,
      });
    });
  });

  describe('selectRepos', () => {
    it('should throw NotFoundException when repositories are not found', async () => {
      const urlIds = ['67cd15516f1797fd790db011', '67cd15516f1797fd790db011'];
      mockRepositoryModel.find.mockResolvedValue([]);

      await expect(service.selectRepos(urlIds)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepositoryModel.find).toHaveBeenCalledWith(
        { _id: { $in: urlIds }, isDeleted: false },
        { _id: 1 },
      );
    });

    it('should update repositories as selected', async () => {
      const urlIds = ['67cd15516f1797fd790db011', '67cd15516f1797fd790db011'];
      const mockRepos = [
        { _id: new Types.ObjectId('67cd15516f1797fd790db011') },
        { _id: new Types.ObjectId('67cd15516f1797fd790db011') },
      ];
      const mockUpdateResult = { modifiedCount: 2 };

      mockRepositoryModel.find.mockResolvedValue(mockRepos);
      mockRepositoryModel.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await service.selectRepos(urlIds);

      expect(mockRepositoryModel.find).toHaveBeenCalledWith(
        { _id: { $in: urlIds }, isDeleted: false },
        { _id: 1 },
      );
      expect(mockRepositoryModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: mockRepos.map((repo) => repo._id.toString()) } },
        { $set: { isSelected: true } },
      );
      expect(result).toEqual(mockUpdateResult);
    });
  });

  describe('selectRepo', () => {
    it('should throw NotFoundException when repository is not found', async () => {
      const urlId = 'repo-id';
      mockRepositoryModel.findOne.mockResolvedValue(null);

      await expect(service.selectRepo(urlId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepositoryModel.findOne).toHaveBeenCalledWith(
        { _id: urlId, isDeleted: false },
        { _id: 1 },
      );
    });

    it('should update repository as selected', async () => {
      const urlId = 'repo-id';
      const mockRepo = { _id: urlId };
      const mockUpdateResult = { modifiedCount: 1 };

      mockRepositoryModel.findOne.mockResolvedValue(mockRepo);
      mockRepositoryModel.updateOne.mockResolvedValue(mockUpdateResult);

      const result = await service.selectRepo(urlId);

      expect(mockRepositoryModel.findOne).toHaveBeenCalledWith(
        { _id: urlId, isDeleted: false },
        { _id: 1 },
      );
      expect(mockRepositoryModel.updateOne).toHaveBeenCalledWith(
        { _id: urlId },
        { $set: { isSelected: true } },
      );
      expect(result).toEqual(mockUpdateResult);
    });
  });

  describe('selectedRepos', () => {
    it('should throw UnauthorizedException when user is not found', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.selectedRepos(1, 10, userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should return selected repositories', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      const mockUser = { id: userId };
      const mockAggregateResult = [
        {
          repositories: [{ id: 'repo1', isSelected: true }],
          totalCount: [{ count: 1 }],
        },
      ];

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockRepositoryModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.selectedRepos(1, 10, userId);

      expect(mockRepositoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        repositories: [{ id: 'repo1', isSelected: true }],
        totalCount: 1,
      });
    });
  });

  describe('selectAll', () => {
    it('should update all repositories as selected', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      const mockUpdateResult = { modifiedCount: 5 };

      mockRepositoryModel.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await service.selectAll(userId);

      expect(mockRepositoryModel.updateMany).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId), isDeleted: false },
        { $set: { isSelected: true } },
      );
      expect(result).toEqual(mockUpdateResult);
    });
  });
});
