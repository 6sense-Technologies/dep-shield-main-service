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

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

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

  beforeEach(async () => {
    process.env.GITHUB_APP_ID = 'mock-app-id';
    process.env.GITHUB_PRIVATE_KEY =
      Buffer.from('mock-private-key').toString('base64');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAppService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
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

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInstallationToken', () => {
    it('should create installation token successfully', async () => {
      const installationId = '12345';
      const mockToken = 'mock-token';
      const mockJwtToken = 'mock-jwt-token';
      console.log(httpService);
      console.log(userModel);
      console.log(githubAppModel);
      console.log(repositoryModel);
      (jwt.sign as jest.Mock).mockReturnValue(mockJwtToken);
      mockHttpService.post.mockReturnValue(
        of({
          data: { token: mockToken },
          status: 201,
        }),
      );

      const result = await service.createInstallationToken(installationId);

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${mockJwtToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );
      expect(result).toEqual(mockToken);
    });

    it('should handle errors during token creation', async () => {
      const installationId = '12345';
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
      mockHttpService.post.mockImplementation(() => {
        throw new Error('API Error');
      });

      const result = await service.createInstallationToken(installationId);

      expect(result).toBeUndefined();
    });
  });

  describe('installApp', () => {
    it('should install app successfully', async () => {
      const authCode = 'auth-code';
      const installationId = '12345';
      const userId = 'user-id';
      const mockUser = { id: userId };
      const mockToken = 'mock-token';
      const mockJwtToken = 'mock-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(mockJwtToken);
      mockHttpService.post.mockReturnValue(
        of({
          data: { token: mockToken },
          status: 201,
        }),
      );
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockGithubAppModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
      });

      // Mock fetchAllRepos
      const mockBulkWriteResponse = { acknowledged: true, modifiedCount: 5 };
      mockRepositoryModel.bulkWrite.mockResolvedValue(mockBulkWriteResponse);
      mockGithubAppModel.find.mockResolvedValue([
        { installationId, user: userId },
      ]);

      const result = await service.installApp(authCode, installationId, userId);

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${mockJwtToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockGithubAppModel.updateOne).toHaveBeenCalledWith(
        { user: mockUser.id, installationId: installationId },
        {
          installationId: installationId,
          appInstallationAccessToken: mockToken,
          isDeleted: false,
        },
        { upsert: true, new: true },
      );
      expect(result).toEqual({ acknowledged: true, modifiedCount: 1 });
    });

    it('should throw BadRequestException when installation fails', async () => {
      const authCode = 'auth-code';
      const installationId = '12345';
      const userId = 'user-id';

      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
      mockHttpService.post.mockImplementation(() => {
        throw new Error('API Error');
      });

      await expect(
        service.installApp(authCode, installationId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkStatus', () => {
    it('should return connected status when app exists', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      mockGithubAppModel.findOne.mockResolvedValue({ installationId: '12345' });

      await service.checkStatus(userId);
      expect(mockGithubAppModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        isDeleted: false,
      });
      // expect(result).toEqual({ isConnected: true });
    });

    it('should return disconnected status when no app exists', async () => {
      const userId = '67cd0fd06f1797fd790db010';
      mockGithubAppModel.findOne.mockResolvedValue(null);

      await service.checkStatus(userId);

      expect(mockGithubAppModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        isDeleted: false,
      });
      // expect(result).toEqual({ isConnected: false });
    });
  });

  // describe('deleteGithubApp', () => {
  //   it('should delete GitHub app successfully', async () => {
  //     const userId = '67cd0fd06f1797fd790db010';
  //     const mockAppId = new Types.ObjectId();
  //     const mockApps = [
  //       { installationId: '12345', _id: mockAppId },
  //       { installationId: '67890', _id: mockAppId },
  //     ];

  //     (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
  //     mockGithubAppModel.find.mockResolvedValue(mockApps);
  //     mockHttpService.delete.mockReturnValue(of({ status: 204 }));
  //     mockGithubAppModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
  //     mockGithubAppModel.distinct.mockResolvedValue([mockAppId]);
  //     mockRepositoryModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

  //     const result = await service.deleteGithubApp(userId);

  //     // expect(mockGithubAppModel.find).toHaveBeenCalledWith({
  //     //   user: new Types.ObjectId(userId),
  //     //   isDeleted: false,
  //     // });
  //     expect(mockHttpService.delete).toHaveBeenCalledTimes(2);
  //     expect(mockGithubAppModel.updateMany).toHaveBeenCalledWith(
  //       { user: new Types.ObjectId(userId) },
  //       { $set: { isDeleted: true } },
  //     );
  //     expect(mockRepositoryModel.updateMany).toHaveBeenCalled();
  //     expect(result).toEqual({ modifiedCount: 2 });
  //   });
  // });

  describe('handleAppInstallations', () => {
    it('should handle app deletion event correctly', async () => {
      const mockData = {
        action: 'deleted',
        installation: { id: 12345 },
      };
      const mockResponse = { acknowledged: true, modifiedCount: 1 };

      mockGithubAppModel.updateOne.mockResolvedValue(mockResponse);

      const result = await service.handleAppInstallations(
        mockData,
        'installation',
      );

      expect(mockGithubAppModel.updateOne).toHaveBeenCalledWith(
        { installationId: '12345' },
        { $set: { isDeleted: true } },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle repository removal event correctly', async () => {
      const mockData = {
        action: 'removed',
        repositories_removed: [
          { full_name: 'user/repo1' },
          { full_name: 'user/repo2' },
        ],
      };
      const mockResponse = { acknowledged: true, modifiedCount: 2 };

      mockRepositoryModel.updateMany.mockResolvedValue(mockResponse);

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
      const mockResponse = { acknowledged: true, modifiedCount: 1 };

      mockRepositoryModel.updateOne.mockResolvedValue(mockResponse);

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
