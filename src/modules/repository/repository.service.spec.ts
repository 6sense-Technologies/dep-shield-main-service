import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { of } from 'rxjs';
import { GithubApp } from '../../database/githubapp-schema/github-app.schema';
import { Repository } from '../../database/repository-schema/repository.schema';
import { User } from '../../database/user-schema/user.schema';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from './repository.service';

// Common mock configurations
const MOCK_USER_ID = '67cd0fd06f1797fd790db010';
const MOCK_TOKEN = 'mock-token';
const MOCK_INSTALLATION_ID = '12345';
const MOCK_REPOS = [
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

// Helper functions
const createMockModel = (methods = {}) => ({
    findById: jest.fn(),
    exec: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    bulkWrite: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
    ...methods,
});

const setupService = async (overrides = {}) => {
    const mockHttpService = { get: jest.fn() };
    const mockGithubAppService = { createInstallationToken: jest.fn() };
    const mockUserModel = createMockModel();
    const mockRepositoryModel = createMockModel();
    const mockGithubAppModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
        providers: [
            RepositoryService,
            { provide: HttpService, useValue: mockHttpService },
            { provide: GithubAppService, useValue: mockGithubAppService },
            { provide: getModelToken(User.name), useValue: mockUserModel },
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

    return {
        service: module.get<RepositoryService>(RepositoryService),
        httpService: mockHttpService,
        githubAppService: mockGithubAppService,
        userModel: mockUserModel,
        repositoryModel: mockRepositoryModel,
        githubAppModel: mockGithubAppModel,
        ...overrides,
    };
};

const setupUserMock = (userModel, userExists = true) => {
    userModel.findById.mockReturnValue({
        exec: jest
            .fn()
            .mockResolvedValue(userExists ? { id: MOCK_USER_ID } : null),
    });
};

describe('RepositoryService', () => {
    let setup: Awaited<ReturnType<typeof setupService>>;

    beforeEach(async () => {
        setup = await setupService();
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(setup.service).toBeDefined();
    });

    describe('getAllRepos', () => {
        const setupGithubAppMock = (
            githubAppModel,
            apps = [{ installationId: MOCK_INSTALLATION_ID }],
        ) => {
            githubAppModel.find.mockResolvedValue(apps);
        };

        it('should throw UnauthorizedException when user is not found', async () => {
            setupUserMock(setup.userModel, false);
            await expect(
                setup.service.getRepositories(MOCK_USER_ID),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw BadRequestException when no GitHub app is installed', async () => {
            setupUserMock(setup.userModel);
            setupGithubAppMock(setup.githubAppModel, []);
            await expect(
                setup.service.getRepositories(MOCK_USER_ID),
            ).rejects.toThrow(BadRequestException);
        });

        it('should fetch and return repositories successfully', async () => {
            setupUserMock(setup.userModel);
            setupGithubAppMock(setup.githubAppModel);
            setup.githubAppService.createInstallationToken.mockResolvedValue(
                MOCK_TOKEN,
            );
            setup.httpService.get.mockReturnValue(
                of({ data: { repositories: MOCK_REPOS }, status: 200 }),
            );
            setup.repositoryModel.bulkWrite.mockResolvedValue({
                acknowledged: true,
            });
            setup.repositoryModel.aggregate.mockResolvedValue([
                {
                    repositories: [{ id: 'repo1' }, { id: 'repo2' }],
                    totalCount: [{ count: 2 }],
                },
            ]);

            const result = await setup.service.getRepositories(MOCK_USER_ID);

            expect(result).toEqual({
                data: [{ id: 'repo1' }, { id: 'repo2' }],
                count: 2,
            });
        });

        it('should handle errors during repository fetch', async () => {
            setupUserMock(setup.userModel);
            setupGithubAppMock(setup.githubAppModel);
            setup.githubAppService.createInstallationToken.mockResolvedValue(
                MOCK_TOKEN,
            );
            setup.httpService.get.mockImplementation(() => {
                throw new Error('API Error');
            });
            setup.repositoryModel.aggregate.mockResolvedValue([
                { repositories: [], totalCount: [] },
            ]);

            const result = await setup.service.getRepositories(MOCK_USER_ID);
            expect(result).toEqual({ data: [], count: 0 });
        });
    });

    describe('selectRepos', () => {
        it('should throw NotFoundException when repositories are not found', async () => {
            setup.repositoryModel.find.mockResolvedValue([]);
            await expect(
                setup.service.selectRepos(['id1', 'id2']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should update repositories as selected', async () => {
            const urlIds = [
                '67ce9701e6bc4af43b0ea01b',
                '67ce9709e6bc4af43b0ea01c',
            ];
            const mockRepos = urlIds.map((id) => ({
                _id: new Types.ObjectId(id),
            }));
            setup.repositoryModel.find.mockResolvedValue(mockRepos);
            setup.repositoryModel.updateMany.mockResolvedValue({
                modifiedCount: 2,
            });

            const result = await setup.service.selectRepos(urlIds);
            expect(result).toEqual({ modifiedCount: 2 });
        });
    });

    describe('selectRepo', () => {
        it('should throw NotFoundException when repository is not found', async () => {
            setup.repositoryModel.findOne.mockResolvedValue(null);
            await expect(setup.service.selectRepo('repo-id')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should update repository as selected', async () => {
            const urlId = 'repo-id';
            setup.repositoryModel.findOne.mockResolvedValue({ _id: urlId });
            setup.repositoryModel.updateOne.mockResolvedValue({
                modifiedCount: 1,
            });

            const result = await setup.service.selectRepo(urlId);
            expect(result).toEqual({ modifiedCount: 1 });
        });
    });

    describe('selectedRepos', () => {
        it('should throw UnauthorizedException when user is not found', async () => {
            setupUserMock(setup.userModel, false);
            await expect(
                setup.service.selectedRepos(1, 10, MOCK_USER_ID),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should return selected repositories', async () => {
            setupUserMock(setup.userModel);
            setup.repositoryModel.aggregate.mockResolvedValue([
                {
                    repositories: [{ id: 'repo1', isSelected: true }],
                    totalCount: [{ count: 1 }],
                },
            ]);

            const result = await setup.service.selectedRepos(
                1,
                10,
                MOCK_USER_ID,
            );
            expect(result).toEqual({
                data: [{ id: 'repo1', isSelected: true }],
                count: 1,
            });
        });
    });

    describe('selectAll', () => {
        it('should update all repositories as selected', async () => {
            setup.repositoryModel.updateMany.mockResolvedValue({
                modifiedCount: 5,
            });
            const result = await setup.service.selectAll(MOCK_USER_ID);
            expect(result).toEqual({ modifiedCount: 5 });
        });
    });
});
