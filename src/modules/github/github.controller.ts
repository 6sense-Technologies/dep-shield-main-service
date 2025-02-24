import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { GithubService } from './github.service';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SelectRepoUrlDto } from './dto/github.dto';

@ApiTags('GitHub')
@Controller('github')
export class GithubController {
  constructor(private githubService: GithubService) {}
  @Get('repos')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard) // Optional: Protect this endpoint with JWT authentication
  async getAllRepos(@Req() req: Request) {
    return this.githubService.getAllRepos(req['user'].userId);
  }
  @Post('select-repos')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard) // Optional: Protect this endpoint with JWT authentication
  async selectRepos(@Body() selectRepoUrlDTO: SelectRepoUrlDto) {
    return this.githubService.selectRepos(selectRepoUrlDTO.selectedUrls);
  }
  @Get('read-repo')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  async readRepo(@Query('repo-id') selectRepoID: string) {
    return this.githubService.readRepo(selectRepoID);
  }
  @Get('read-package-json')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  async readRepoPackageJso(@Query('repo-id') selectRepoID: string) {
    return this.githubService.readPackageJson(selectRepoID);
  }

  @Get('app/callback')
  async listenCallback(
    @Query('code') authCode: string,
    @Query('installation_id') installtionId: string,
  ) {
    return this.githubService.createAppAccessToken(installtionId);
  }
}
