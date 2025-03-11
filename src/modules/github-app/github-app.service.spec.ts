import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GithubAppService } from './github-app.service';
import { User, UserDocument } from '../../database/user-schema/user.schema';
import {
  GithubApp,
  GithubAppDocument,
} from '../../database/githubapp-schema/github-app.schema';
import {
  Repository,
  RepositoryDocument,
} from '../../database/repository-schema/repository.schema';
import { of } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('GithubAppService', () => {
  let service: GithubAppService;
  let httpService: HttpService;
  let userModel: Model<UserDocument>;
  let githubAppModel: Model<GithubAppDocument>;
  let repositoryModel: Model<RepositoryDocument>;

  // Mock data constants
  const mockUserId = '67cd0fd06f1797fd790db010';
  const mockInstallationId = '12345';
  const mockJwtToken = 'mock-jwt-token';
  const mockToken = 'mock-token';
  const mockUser = { id: mockUserId };

  // Mock services setup
  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };
  const mockUserModel = { findById: jest.fn() };
  const mockGithubAppModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    distinct: jest.fn(),
  };
  const mockRepositoryModel = {
    bulkWrite: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
  };

  // Common mock responses
  const successfulResponse = { acknowledged: true, modifiedCount: 1 };
  const bulkResponse = { acknowledged: true, modifiedCount: 5 };

  // Helper to initialize environment variables
  const setupEnvironment = () => {
    console.log(httpService);
    console.log(userModel);
    console.log(githubAppModel);
    console.log(repositoryModel);
    process.env.GITHUB_APP_ID = 'mock-app-id';
    process.env.GITHUB_PRIVATE_KEY =
      Buffer.from('mock-private-key').toString('base64');
  };

  // Helper to mock HTTP token response
  const mockTokenCreation = (success = true) => {
    if (success) {
      mockHttpService.post.mockReturnValue(
        of({ data: { token: mockToken }, status: 201 }),
      );
    } else {
      mockHttpService.post.mockImplementation(() => {
        throw new Error('API Error');
      });
    }
  };

  // Helper to setup common test module
  const setupTestModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAppService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(GithubApp.name),
          useValue: mockGithubAppModel,
        },
        {
          provide: getModelToken(Repository.name),
          useValue: mockRepositoryModel,
        },
      ],
    }).compile();

    service = module.get<GithubAppService>(GithubAppService);
    httpService = module.get<HttpService>(HttpService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    githubAppModel = module.get<Model<GithubAppDocument>>(
      getModelToken(GithubApp.name),
    );
    repositoryModel = module.get<Model<RepositoryDocument>>(
      getModelToken(Repository.name),
    );
  };

  beforeEach(async () => {
    setupEnvironment();
    await setupTestModule();
    (jwt.sign as jest.Mock).mockReturnValue(mockJwtToken);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInstallationToken', () => {
    it('should create installation token successfully', async () => {
      mockTokenCreation(true);

      const result = await service.createInstallationToken(mockInstallationId);

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${mockInstallationId}/access_tokens`,
        {},
        expect.objectContaining({ headers: expect.any(Object) }),
      );
      expect(result).toEqual(mockToken);
    });

    it('should handle errors during token creation', async () => {
      mockTokenCreation(false);

      const result = await service.createInstallationToken(mockInstallationId);
      expect(result).toBeUndefined();
    });
  });

  describe('installApp', () => {
    const authCode = 'auth-code';

    beforeEach(() => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockGithubAppModel.updateOne.mockResolvedValue(successfulResponse);
      mockRepositoryModel.bulkWrite.mockResolvedValue(bulkResponse);
      mockGithubAppModel.find.mockResolvedValue([
        { installationId: mockInstallationId, user: mockUserId },
      ]);
    });

    it('should install app successfully', async () => {
      mockTokenCreation(true);

      const result = await service.installApp(
        authCode,
        mockInstallationId,
        mockUserId,
      );

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockGithubAppModel.updateOne).toHaveBeenCalledWith(
        { user: mockUser.id, installationId: mockInstallationId },
        expect.any(Object),
        { upsert: true, new: true },
      );
      expect(result).toEqual(successfulResponse);
    });

    it('should throw BadRequestException when installation fails', async () => {
      mockTokenCreation(false);

      await expect(
        service.installApp(authCode, mockInstallationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkStatus', () => {
    it('should return connected status when app exists', async () => {
      mockGithubAppModel.findOne.mockResolvedValue({
        installationId: mockInstallationId,
      });

      await service.checkStatus(mockUserId);
      expect(mockGithubAppModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(mockUserId),
        isDeleted: false,
      });
    });

    it('should return disconnected status when no app exists', async () => {
      mockGithubAppModel.findOne.mockResolvedValue(null);

      await service.checkStatus(mockUserId);
      expect(mockGithubAppModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(mockUserId),
        isDeleted: false,
      });
    });
  });

  describe('handleAppInstallations', () => {
    it('should handle app deletion event correctly', async () => {
      const mockData = { action: 'deleted', installation: { id: 12345 } };
      mockGithubAppModel.updateOne.mockResolvedValue(successfulResponse);

      const result = await service.handleAppInstallations(
        mockData,
        'installation',
      );

      expect(mockGithubAppModel.updateOne).toHaveBeenCalledWith(
        { installationId: '12345' },
        { $set: { isDeleted: true } },
      );
      expect(result).toEqual(successfulResponse);
    });

    it('should handle repository removal event correctly', async () => {
      const mockData = {
        action: 'removed',
        repositories_removed: [
          { full_name: 'user/repo1' },
          { full_name: 'user/repo2' },
        ],
      };
      mockRepositoryModel.updateMany.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 2,
      });

      const result = await service.handleAppInstallations(
        mockData,
        'installation_repositories',
      );

      expect(mockRepositoryModel.updateMany).toHaveBeenCalledWith(
        { repoName: { $in: ['user/repo1', 'user/repo2'] } },
        { $set: { isDeleted: true } },
      );
      expect(result).toEqual('Webhook action performed');
    });
  });

  describe('handleGithubRepositoryOperations', () => {
    it('should handle repository deletion correctly', async () => {
      const mockData = {
        action: 'deleted',
        repository: { full_name: 'user/repo1' },
      };
      mockRepositoryModel.updateOne.mockResolvedValue(successfulResponse);

      const result = await service.handleGithubRepositoryOperations(mockData);

      expect(mockRepositoryModel.updateOne).toHaveBeenCalledWith(
        { repoName: 'user/repo1' },
        { $set: { isDeleted: true } },
      );
      expect(result).toEqual('Github app deleted user/repo1');
    });

    it('should handle non-deletion actions', async () => {
      const mockData = {
        action: 'created',
        repository: { full_name: 'user/repo1' },
      };

      const result = await service.handleGithubRepositoryOperations(mockData);

      expect(mockRepositoryModel.updateOne).not.toHaveBeenCalled();
      expect(result).toEqual('No action performed');
    });
  });
});
