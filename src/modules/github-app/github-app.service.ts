import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
  GithubApp,
  GithubAppDocument,
} from '../../database/githubapp-schema/github-app.schema';
import { User, UserDocument } from '../../database/user-schema/user.schema';
import * as jwt from 'jsonwebtoken';
import { validateAuthCode, validateInstallationId } from './validator/validate';
import {
  Repository,
  RepositoryDocument,
} from 'src/database/repository-schema/repository.schema';
@Injectable()
export class GithubAppService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(GithubApp.name) private githubApp: Model<GithubAppDocument>,
    @InjectModel(Repository.name) private repository: Model<RepositoryDocument>,
  ) {}
  private generateJwt(): string {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    const payload = {
      iat: now, // Issued at time
      exp: now + 600, // Expiration time (10 minutes from now)
      iss: process.env.GITHUB_APP_ID, // GitHub App ID
    };

    const privateKey = Buffer.from(
      process.env.GITHUB_PRIVATE_KEY,
      'base64',
    ).toString('utf8');

    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });
  }
  public async createInstallationToken(installationId: string) {
    try {
      console.log(installationId);
      const jwt = this.generateJwt();
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
      console.log(`Installation access token ${githubInstallationAccessToken}`);
      return githubInstallationAccessToken;
    } catch {
      console.log(`Error creating app installation token...`);
    }
  }

  public async installApp(
    authCode: string,
    installationId: string,
    userId: string,
  ) {
    validateAuthCode(authCode);
    validateInstallationId(installationId);
    try {
      console.log(
        `Invoke with authCode: ${authCode}, InstallationId: ${installationId}, from User-${userId}`,
      );

      const jwt = this.generateJwt();

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
      const user = await this.userModel.findById(userId);
      const githubAppInfo = await this.githubApp.updateOne(
        { user: user.id, installationId: installationId }, // Query: Find by user
        {
          installationId: installationId,
          appInstallationAccessToken: githubInstallationAccessToken,
          isDeleted: false,
        },
        { upsert: true, new: true }, // Create if not exists, update if exists
      );

      return githubAppInfo;
    } catch (error) {
      console.log(error);
      console.error('Error creating app access token:', error.message);
      throw new BadRequestException('Github App Installation failed');
    }
  }
  public async checkStatus(userId: string) {
    const githubApp = await this.githubApp.findOne({
      user: new Types.ObjectId(userId),
      isDeleted: false,
    });
    if (!githubApp) {
      return { isConnected: false };
    } else {
      return { isConnected: true };
    }
  }
  public async deleteGithubApp(userId: string) {
    // console.log(userId);
    const githubApps = await this.githubApp.find({
      user: new Types.ObjectId(userId),
      isDeleted: false,
    });
    console.log(githubApps);
    for (let i = 0; i < githubApps.length; i += 1) {
      const token = this.generateJwt();
      if (!token) continue;
      console.log(`JWT Token generated: ${token}`);

      try {
        const response = await firstValueFrom(
          this.httpService.delete(
            `https://api.github.com/app/installations/${githubApps[i].installationId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
              },
            },
          ),
        );
        if (response.status === 204) {
          console.log(`Uninstalled app ${githubApps[i].installationId}`);
        } else {
          console.log(
            `Uninstall unacknowledged from github ${githubApps[i].installationId}`,
          );
        }
      } catch {
        // console.log(error);
        console.log(`Error uninstalling app ${githubApps[i].installationId}`);
      }
    }
    const deletedGithubApps = await this.githubApp.updateMany(
      { user: new Types.ObjectId(userId) },
      { $set: { isDeleted: true } },
    );

    await this.repository.updateMany(
      {
        githubApp: {
          $in: await this.githubApp.find({ user: userId }).distinct('_id'),
        },
      },
      { $set: { isDeleted: true, isSelected: false } },
    );

    return deletedGithubApps;
  }

  public async handleAppInstallations(data: any) {
    console.log(data);
    let action: boolean = false;
    if (data.action === 'suspend' || data.action === 'deleted') {
      console.log(`Delete github app webhook triggered......`);
      console.log(`Deleting ${data.installation.id}.....`);
      const installationId = data.installation.id.toString();
      const response = await this.githubApp.updateOne(
        { installationId },
        { $set: { isDeleted: true } },
      );

      return response;
    }
    if (data.action === 'removed' && 'repositories_removed' in data) {
      const removedRepos = [];
      for (let i = 0; i < data.repositories_removed.length; i += 1) {
        removedRepos.push(data.repositories_removed[i].full_name);
      }
      // Bulk update isDeleted to false where repoName is in removedRepos
      const response = await this.repository.updateMany(
        { repoName: { $in: removedRepos } }, // Filter for repoName in removedRepos array
        { $set: { isDeleted: true } }, // Set isDeleted to true
      );
      action = true;
      console.log(response);
    }

    if (data.action === 'added' && 'repositories_added' in data) {
      const addedRepos = [];
      console.log(data.repositories_added.length);
      for (let i = 0; i < data.repositories_added.length; i += 1) {
        addedRepos.push(data.repositories_added[i].full_name.toString());
      }
      console.log(addedRepos);
      console.log(data.repositories_removed);
      // Bulk update isDeleted to false where repoName is in addedRepos
      const response = await this.repository.updateMany(
        { repoName: { $in: addedRepos } }, // Filter for repoName in addedRepos array
        { $set: { isDeleted: false } }, // Set isDeleted to false
      );
      action = true;
      console.log(response);
    }
    if (action) {
      return 'Webhook action performed';
    } else {
      return 'No action performed';
    }
  }
}
