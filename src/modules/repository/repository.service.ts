import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Repository, RepositoryDocument } from 'src/schemas/repository.schema';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
@Injectable()
export class RepositoryService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Repository.name)
    private RepositoryModel: Model<RepositoryDocument>,
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
  // async getAllRepos(userId: string) {
  //   const user = await this.userModel.findById(userId).exec();
  //   if (!user) {
  //     throw new UnauthorizedException('user is not valid');
  //   }
  //   const token = user.githubAccessToken;
  //   console.log(`Querying api with access token: ${token}`);
  //   if (token === 'N/A') {
  //     throw new UnauthorizedException('Invalid github access token');
  //   }
  //   try {
  //     const response = await firstValueFrom(
  //       this.httpService.get('https://api.github.com/user/repos', {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           Accept: 'application/vnd.github.v3+json',
  //         },
  //         params: {
  //           // Fetch all repos (both private and public)
  //           visibility: 'all',
  //           affiliation: 'owner,collaborator,organization_member',
  //           per_page: 100, // Maximum number of repos per page
  //         },
  //       }),
  //     );

  //     // Extract repository URLs
  //     const repoUrls = response.data.map((repo) => ({
  //       user: user._id,
  //       repoUrl: repo.url, // Use `repo.url` or `repo.html_url` based on your requirement
  //     }));

  //     // Save or update repository URLs in bulk
  //     const bulkOps = repoUrls.map((repo) => ({
  //       updateOne: {
  //         filter: { user: repo.user, repoUrl: repo.repoUrl }, // Match by user and repoUrl
  //         update: { $set: repo }, // Update or insert the document
  //         upsert: true, // Enable upsert
  //       },
  //     }));

  //     // Perform bulk write operation
  //     await this.RepositoryModel.bulkWrite(bulkOps);

  //     // Fetch and return all saved URLs for the user
  //     const savedUrls = await this.RepositoryModel
  //       .find({ user: user._id })
  //       .exec();

  //     return savedUrls;
  //   } catch (error) {
  //     console.error('Error fetching GitHub repositories:', error.message);
  //     throw new Error('Failed to fetch repositories');
  //   }
  // }
  // async selectRepos(urlIds: string[]) {
  //   const updated = await this.RepositoryModel.updateMany(
  //     { _id: { $in: urlIds } }, // Selects all documents where _id is in urlIds array
  //     { $set: { isSelected: true } }, // Updates isSelected to true
  //   );

  //   return updated;
  // }
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
  private generateJwt(): string {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    const payload = {
      iat: now, // Issued at time
      exp: now + 600, // Expiration time (10 minutes from now)
      iss: process.env.GITHUB_APP_ID, // GitHub App ID
    };

    // Load the private key (ensure the key is correctly formatted)
    const privateKey = fs.readFileSync('./pkey.pem', 'utf8');

    // Sign and return the JWT
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });
  }

  public async createAppAccessToken(authCode: string, installationId: string) {
    try {
      console.log(
        `Invoke with authCode: ${authCode}, InstallationId: ${installationId}`,
      );
      const jwt = this.generateJwt();
      // console.log(jwt);
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/app/installations/${installationId}/access_tokens`,
          {}, // Empty body
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        ),
      );

      const githubInstallationAccessToken = tokenResponse.data.token;

      if (!githubInstallationAccessToken) {
        throw new Error('Failed to retrieve installation access token');
      }
      const response = await this.getInstallationRepos(
        githubInstallationAccessToken,
      );
      // const installInfo = await this.getInstallationInfos(
      //   installationId,
      //   githubInstallationAccessToken,
      // );
      // console.log(installInfo);
      // // console.log(installInfo);
      // for (let i = 0; i < response.repositories.length; i += 1) {
      //   await this.RepositoryModel.create({
      //     user: this.userModel.findOne({emailAddress: })
      //   })
      // }
      return {
        repos: response,
        githubInstallationAccessToken,
      };
    } catch (error) {
      console.error('Error creating app access token:', error.message);
      throw new Error('Failed to create app access token: ' + error.message);
    }
  }
  public async getInstallationInfos(
    installationId: string,
    githubInstallationAccessToken: string,
  ) {
    try {
      const installationInfo = await firstValueFrom(
        this.httpService.get(`https://api.github.com/installation`, {
          headers: {
            Authorization: `Bearer ${githubInstallationAccessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      );
      console.log(installationInfo);
      return installationInfo.data;
    } catch (error) {
      console.error('Error fetching installation infos:', error.message);
      throw new Error('Failed to fetch installation infos');
    }
  }
  public async getInstallationRepos(githubInstallationAccessToken: string) {
    try {
      const reposResponse = await firstValueFrom(
        this.httpService.get(
          'https://api.github.com/installation/repositories',
          {
            headers: {
              Authorization: `Bearer ${githubInstallationAccessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        ),
      );

      return reposResponse.data;
    } catch (error) {
      console.error('Error fetching installation repositories:', error.message);
      throw new Error('Failed to fetch installation repositories');
    }
  }
}
