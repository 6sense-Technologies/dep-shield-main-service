import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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
    return await this.githubAppService.createAppAccessToken(
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
}
