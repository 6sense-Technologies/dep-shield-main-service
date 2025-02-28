import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { GithubApp, GithubAppDocument } from 'src/schemas/GithubApp.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class GithubAppService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(GithubApp.name) private githubApp: Model<GithubAppDocument>,
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
      console.log(`Error creating app installation token`);
    }
  }

  public async installApp(
    authCode: string,
    installationId: string,
    userId: string,
  ) {
    try {
      console.log(
        `Invoke with authCode: ${authCode}, InstallationId: ${installationId}, from User-${userId}`,
      );

      const jwt = this.generateJwt();
      console.log(jwt);
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
    // console.log(githubApps);
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
        console.log(`Error uninstalling app ${githubApps[i].installationId}`);
      }
    }
    const deleted = await this.githubApp.updateMany(
      { user: new Types.ObjectId(userId) },
      { $set: { isDeleted: true } },
    );

    return deleted;
  }
}
