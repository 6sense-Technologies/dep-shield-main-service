import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { GithubApp, GithubAppDocument } from 'src/schemas/GithubApp.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
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

    // Load the private key (ensure the key is correctly formatted)
    const privateKey = fs.readFileSync('./pkey.pem', 'utf8');

    // Sign and return the JWT
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });
  }

  public async createAppAccessToken(
    authCode: string,
    installationId: string,
    userId: string,
  ) {
    try {
      console.log(
        `Invoke with authCode: ${authCode}, InstallationId: ${installationId}, from User-${userId}`,
      );
      const githubApp = await this.githubApp.findOne({ user: userId }).exec();
      let tempInstallationId = installationId;
      if (githubApp) {
        tempInstallationId = githubApp.installationId;
      }

      const jwt = this.generateJwt();
      // console.log(jwt);
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/app/installations/${tempInstallationId}/access_tokens`,
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
      const user = await this.userModel.findOne({ user: userId });
      await this.githubApp.updateOne(
        { user: user }, // Query: Find by user
        {
          installationId: tempInstallationId,
          appInstallationAccessToken: githubInstallationAccessToken,
        },
        { upsert: true }, // Create if not exists, update if exists
      );

      return {
        githubInstallationAccessToken,
      };
    } catch (error) {
      console.error('Error creating app access token:', error.message);
      throw new Error('Failed to create app access token: ' + error.message);
    }
  }
  public async checkStatus(userId: string) {
    const githubApp = await this.githubApp.findOne({
      user: new Types.ObjectId(userId),
    });
    if (!githubApp) {
      return { isConnected: false };
    } else {
      return { isConnected: true };
    }
  }
}
