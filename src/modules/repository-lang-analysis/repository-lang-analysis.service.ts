import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class RepositoryLangAnalysisService {
  constructor(
    private readonly httpService: HttpService,
    private readonly githubAppService: GithubAppService,
    private readonly repositoryService: RepositoryService,
  ) {}

  private async fetchRepositoryContents(
    repoName: string,
    githubToken: string,
  ): Promise<string[]> {
    const url = `https://api.github.com/repos/${repoName}/contents`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      );
      return response.data.map((file: { name: string }) => file.name);
    } catch (error) {
      throw new HttpException(
        'Error fetching repository contents',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async detectLanguage(repoName: string, githubToken: string): Promise<string> {
    const url = `https://api.github.com/repos/${repoName}/languages`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      );

      const languages = response.data;
      return Object.keys(languages).length > 0
        ? Object.keys(languages).reduce((a, b) =>
            languages[a] > languages[b] ? a : b,
          )
        : 'Unknown';
    } catch (error) {
      throw new HttpException(
        'Error fetching repository languages',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async detectPackageManager(
    repoName: string,
    githubToken: string,
  ): Promise<string> {
    const packageManagerFiles = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'bower.json': 'bower',
      'Podfile.lock': 'cocoapods',
      Cartfile: 'carthage',
      'Package.swift': 'spm',
      'build.gradle': 'gradle',
      'build.gradle.kts': 'gradle',
      'pom.xml': 'maven',
      WORKSPACE: 'bazel',
      'BUILD.bazel': 'bazel',
      'install.json': 'bazel',
    };

    const repositoryFiles = await this.fetchRepositoryContents(
      repoName,
      githubToken,
    );

    for (const [file, manager] of Object.entries(packageManagerFiles)) {
      if (repositoryFiles.includes(file)) {
        return manager;
      }
    }

    return 'unknown';
  }

  async analyzeRepository(
    repoId: string,
  ): Promise<{ language: string; packageManager: string }> {
    const repository = await this.repositoryService.getRepoDetailsbyId(repoId);
    if (!repository) {
        throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
    }
    const token = await this.githubAppService.createInstallationToken(
      repository.githubApp.installationId,
    );
    if (!token) {
        throw new HttpException('Error creating installation token', HttpStatus.BAD_REQUEST);
    }
    const [language, packageManager] = await Promise.all([
      this.detectLanguage(repository.repoName, token),
      this.detectPackageManager(repository.repoName, token),
    ]);

    return { language, packageManager };
  }
}
