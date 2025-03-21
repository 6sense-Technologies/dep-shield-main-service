import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { RepositoryService } from './repository.service';
// import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import {
    SelectRepoUrlsDto,
    SelectRepoUrlSingleDTO,
} from './dto/bulkselect.dto';
// import { SelectRepoUrlDto } from './dto/github.dto';

@Controller('repositories')
export class RepositoryController {
    constructor(private repositoryService: RepositoryService) {}
    @Get('repos')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getAllRepos(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: Request,
    ) {
        return this.repositoryService.getAllRepos(
            req['user'].userId,
            +page,
            +limit,
        );
    }
    @Post('select-repos')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async selectRepos(@Body() selectRepoUrlsDTO: SelectRepoUrlsDto) {
        return this.repositoryService.selectRepos(
            selectRepoUrlsDTO.selectedRepos,
        );
    }
    @Post('select-repo')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async selectRepo(@Body() selectRepoUrlsSingleDTO: SelectRepoUrlSingleDTO) {
        return this.repositoryService.selectRepo(
            selectRepoUrlsSingleDTO.selectedRepo,
        );
    }

    @Get('selected-repos')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getSelectedRepos(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: Request,
    ) {
        return this.repositoryService.selectedRepos(
            +page,
            +limit,
            req['user'].userId,
        );
    }

    @Get(':id/licenses')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getLicensesByRepoId(
        @Param('id') repoId: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: Request,
    ) {
        return this.repositoryService.getLicensesByRepoId(
            repoId,
            +page,
            +limit,
            req['user'].userId,
        );
    }

    @Post('select-all')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async selectAllRepos(@Req() req: Request) {
        return this.repositoryService.selectAll(req['user'].userId);
    }

    @UseGuards(AccessTokenGuard)
    @ApiBearerAuth()
    @Get('read-dependencies')
    async readDependency(
        @Query('repo-id') repoId: string,
        @Req() req: Request,
    ) {
        return await this.repositoryService.readDependencies(
            repoId,
            req['user'].userId,
        );
    }
}
