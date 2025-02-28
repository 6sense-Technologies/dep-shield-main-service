import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Repository, RepositoryDocument } from 'src/schemas/repository.schema';
import { GithubApp, GithubAppDocument } from 'src/schemas/GithubApp.schema';
import { GithubAppService } from '../github-app/github-app.service';
@Injectable()
export class RepositoryService {
  constructor(
    private readonly httpService: HttpService,
    private readonly githubAppService: GithubAppService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Repository.name)
    private RepositoryModel: Model<RepositoryDocument>,
    @InjectModel(GithubApp.name)
    private GithubAppModel: Model<GithubAppDocument>,
  ) {}

  // async verifyAccessToken(token: string) {
  //   try {
  //     const response = await firstValueFrom(
  //       this.httpService.get('https://api.github.com/user', {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }),
  //     );

  //     // If the request is successful, the token is valid
  //     return response;
  //   } catch {
  //     //console.log(Error validating github token');
  //     // If there's an error, the token is invalid
  //     return null;
  //   }
  // }
  // async getUserEmails(token: string) {
  //   try {
  //     const response = await firstValueFrom(
  //       this.httpService.get('https://api.github.com/user/emails', {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           Accept: 'application/vnd.github.v3+json',
  //         },
  //       }),
  //     );
  //     // Return the list of email addresses
  //     return response.data[0]; // only getting the primary email address
  //   } catch (error) {
  //     console.error('Error fetching GitHub user emails:', error.message);
  //     throw new Error('Failed to fetch user emails');
  //   }
  // }
  async getAllRepos(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException('user is not valid');
    }
    const githubApps = await this.GithubAppModel.find({ user: user });
    // console.log(githubApps);
    if (githubApps.length === 0) {
      throw new BadRequestException('No github app is not installed');
    }

    try {
      const repos = [];
      for (let i = 0; i < githubApps.length; i += 1) {
        const token = await this.githubAppService.createInstallationToken(
          githubApps[i].installationId,
        );
        console.log(`Querying api with access token: ${token}`);
        const response = await firstValueFrom(
          this.httpService.get(
            'https://api.github.com/installation/repositories',
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
              params: {
                // Fetch all repos (both private and public)
                visibility: 'all',
                affiliation: 'owner,collaborator,organization_member',
                per_page: 100, // Maximum number of repos per page
              },
            },
          ),
        );

        for (let i = 0; i < response.data.repositories.length; i += 1) {
          repos.push({ user, repoUrl: response.data.repositories[i].url });
        }
      }
      const savedRepos = await this.RepositoryModel.insertMany(repos); //TODO: Make bulk write

      return savedRepos;
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error.message);
      // throw new Error('Failed to fetch repositories');
    }
  }
  async selectRepos(urlIds: string[]) {
    const updated = await this.RepositoryModel.updateMany(
      { _id: { $in: urlIds } }, // Selects all documents where _id is in urlIds array
      { $set: { isSelected: true } }, // Updates isSelected to true
    );

    return updated;
  }
  // async readRepo(repoId: string) {
  //   // Find the repository by ID
  //   const repo = await this.RepositoryModel.findById(repoId);
  //   if (!repo) {
  //     throw new NotFoundException('Repository not found');
  //   }

  //   // Extract the owner and repo name from the repoUrl
  //   const repoUrl = repo.repoUrl;
  //   const urlParts = repoUrl.split('/');
  //   const owner = urlParts[urlParts.length - 2]; // Second-to-last part of the URL
  //   const repoName = urlParts[urlParts.length - 1]; // Last part of the URL

  //   // Get the GitHub access token from the user
  //   const user = await this.userModel.findById(repo.user).exec();
  //   if (!user || !user.githubAccessToken || user.githubAccessToken === 'N/A') {
  //     throw new UnauthorizedException('Invalid GitHub access token');
  //   }

  //   try {
  //     // Fetch the contents of the repository
  //     const response = await firstValueFrom(
  //       this.httpService.get(
  //         `https://api.github.com/repos/${owner}/${repoName}/contents`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${user.githubAccessToken}`,
  //             Accept: 'application/vnd.github.v3+json',
  //           },
  //         },
  //       ),
  //     );

  //     // Extract file names and types
  //     const files = response.data.map((item) => ({
  //       name: item.name,
  //       type: item.type, // 'file' or 'dir'
  //       path: item.path,
  //       url: item.html_url,
  //     }));

  //     return files;
  //   } catch (error) {
  //     console.error('Error fetching repository contents:', error.message);
  //     throw new Error('Failed to fetch repository contents');
  //   }
  // }

  // async readPackageJson(repoId: string) {
  //   // Find the repository by ID
  //   const repo = await this.RepositoryModel.findById(repoId);
  //   if (!repo) {
  //     throw new NotFoundException('Repository not found');
  //   }

  //   // Extract the owner and repo name from the repoUrl
  //   const repoUrl = repo.repoUrl;
  //   const urlParts = repoUrl.split('/');
  //   const owner = urlParts[urlParts.length - 2]; // Second-to-last part of the URL
  //   const repoName = urlParts[urlParts.length - 1]; // Last part of the URL

  //   // Get the GitHub access token from the user
  //   const user = await this.userModel.findById(repo.user).exec();
  //   if (!user || !user.githubAccessToken || user.githubAccessToken === 'N/A') {
  //     throw new UnauthorizedException('Invalid GitHub access token');
  //   }

  //   try {
  //     // Fetch the package.json file from the repository
  //     const response = await firstValueFrom(
  //       this.httpService.get(
  //         `https://api.github.com/repos/${owner}/${repoName}/contents/package.json`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${user.githubAccessToken}`,
  //             Accept: 'application/vnd.github.v3+json',
  //           },
  //         },
  //       ),
  //     );

  //     if (!response.data || !response.data.content) {
  //       throw new NotFoundException('package.json not found');
  //     }

  //     // Decode the Base64-encoded package.json content
  //     const packageJsonContent = Buffer.from(
  //       response.data.content,
  //       'base64',
  //     ).toString('utf-8');

  //     return JSON.parse(packageJsonContent); // Parse it as JSON and return
  //   } catch (error) {
  //     console.error('Error fetching package.json:', error.message);
  //     throw new NotFoundException('Failed to fetch package.json file');
  //   }
  // }
}
