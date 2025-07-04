import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GithubAppService } from './github-app.service';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('github-app')
export class GithubAppController {
  constructor(private githubAppService: GithubAppService) {}
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @Get('install')
  async getInstall(
    @Query('code') authCode: string,
    @Query('installation_id') installationId: string,
    @Req() req: Request,
  ) {
    return await this.githubAppService.installApp(
      authCode,
      installationId,
      req['user'].userId,
    );
  }

  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @Get('check-status')
  async checkStatus(@Req() req: Request) {
    return await this.githubAppService.checkStatus(req['user'].userId);
  }

  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @Get('disconnect')
  async disConnect(@Req() req: Request) {
    return await this.githubAppService.deleteGithubApp(req['user'].userId);
  }

  @Post('webhook')
  async webhookListener(
    @Headers('X-GitHub-Event') event: string,
    @Body() data: any,
  ) {
    if (event === 'installation' || event === 'installation_repositories') {
      return await this.githubAppService.handleAppInstallations(data, event);
    }
    if (event === 'repository') {
      return await this.githubAppService.handleGithubRepositoryOperations(data);
    }
    return 'No Action performed';
  }
}
