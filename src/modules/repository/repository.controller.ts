import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { RepositoryService } from './repository.service';
// import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { SelectRepoUrlDto } from './dto/github.dto';
// import { SelectRepoUrlDto } from './dto/github.dto';

@ApiTags('GitHub')
@Controller('github')
export class RepositoryController {
  constructor(private repositoryService: RepositoryService) {}
  @Get('repos')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard) // Optional: Protect this endpoint with JWT authentication
  async getAllRepos(@Req() req: Request) {
    return this.repositoryService.getAllRepos(req['user'].userId);
  }
  @Post('select-repos')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard) // Optional: Protect this endpoint with JWT authentication
  async selectRepos(@Body() selectRepoUrlDTO: SelectRepoUrlDto) {
    return this.repositoryService.selectRepos(selectRepoUrlDTO.selectedUrls);
  }
  // @Get('read-repo')
  // @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // async readRepo(@Query('repo-id') selectRepoID: string) {
  //   return this.githubService.readRepo(selectRepoID);
  // }
  // @Get('read-package-json')
  // @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // async readRepoPackageJso(@Query('repo-id') selectRepoID: string) {
  //   return this.githubService.readPackageJson(selectRepoID);
  // }
}
