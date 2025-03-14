import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { GithubAppService } from '../github-app/github-app.service';
import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class RepositoryLangAnalysisService {
  private readonly logger = new Logger(RepositoryLangAnalysisService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly githubAppService: GithubAppService,
    private readonly repositoryService: RepositoryService,
  ) {}

  /**
   * Fetch repository contents in one API call.
   */
  private async fetchRepositoryContents(
    repoName: string,
    githubToken: string,
  ): Promise<Set<string>> {
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
      return new Set(response.data.map((file: { name: string }) => file.name));
    } catch (error) {
      this.logger.error(
        `Error fetching repository contents for ${repoName}`,
        error.stack,
      );
      throw new HttpException(
        'Error fetching repository contents',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Detect all languages used in the repository.
   */
  private async detectLanguage(
    repoName: string,
    githubToken: string,
  ): Promise<string[]> {
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

      const languages = Object.keys(response.data);
      return languages.length > 0 ? languages : ['Unknown'];
    } catch (error) {
      this.logger.error(
        `Error fetching languages for ${repoName}`,
        error.stack,
      );
      throw new HttpException(
        'Error fetching repository languages',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Detect package manager based on the presence of specific files.
   */
  private detectPackageManager(repositoryFiles: Set<string>): string {
    const packageManagerFiles: Record<string, string> = {
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

    for (const [file, manager] of Object.entries(packageManagerFiles)) {
      if (repositoryFiles.has(file)) {
        return manager;
      }
    }

    return 'unknown';
  }

  /**
   * Main function to analyze a repository.
   */
  async analyzeRepository(
    repoId: string,
  ): Promise<{ languages: string[]; packageManager: string }> {
    const repository = await this.repositoryService.getRepoDetailsbyId(repoId);
    if (!repository) {
      throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
    }

    const token = await this.githubAppService.createInstallationToken(
      repository.githubApp.installationId,
    );
    if (!token) {
      throw new HttpException(
        'Error creating installation token',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Fetch repository contents & languages in parallel
    const [repositoryFiles, languages] = await Promise.all([
      this.fetchRepositoryContents(repository.repoName, token),
      this.detectLanguage(repository.repoName, token),
    ]);

    const packageManager = this.detectPackageManager(repositoryFiles);

    return { languages, packageManager };
  }
}
