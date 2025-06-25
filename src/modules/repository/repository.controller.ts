import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
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
import { GetRepositoryDto } from './dto/getRepository.dto';
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
        return this.repositoryService.getRepositories(
            req['user'].userId,
            page,
            limit,
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

    @Post('github-webhooks')
    async scanRepoHook(@Body() webhook: any) {
        return this.repositoryService.scanRepoWebhook(webhook);
    }

    @Post('webhook')
    async testWebhook(@Body() webhook: any) {
        return this.repositoryService.testWebhook(webhook);
    }

    @Get('test')
    async test(@Query('id') id: string) {
        return this.repositoryService.getHooks(id);
    }

    @Post('select-repo')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async selectRepo(@Body() selectRepoUrlsSingleDTO: SelectRepoUrlSingleDTO) {
        return this.repositoryService.selectRepo(
            selectRepoUrlsSingleDTO.selectedRepo,
        );
    }

    @Post('scan-repo')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async scanRepo(@Body() selectRepoUrlsSingleDTO: SelectRepoUrlSingleDTO) {
        return this.repositoryService.scanRepo(
            selectRepoUrlsSingleDTO.selectedRepo,
        );
    }

    @Post('unselect-repo')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async unSelectRepo(
        @Body() selectRepoUrlsSingleDTO: SelectRepoUrlSingleDTO,
    ) {
        return this.repositoryService.unSelectRepo(
            selectRepoUrlsSingleDTO.selectedRepo,
        );
    }

    @Get('selected-repos')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getSelectedRepos(
        @Query() query: GetRepositoryDto,
        @Req() req: Request,
    ) {
        return this.repositoryService.selectedRepos(query, req['user'].userId);
    }

    @Get(':repoId/branches')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getAllBranches(@Param('repoId') repoId: string, @Req() req: Request) {
        return this.repositoryService.getBranches(repoId, req['user'].userId);
    }

    @Patch(':repoId')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async updateRepo(
        @Param('repoId') repoId: string,
        @Body('branchName') branchName: string,
    ) {
        return this.repositoryService.updateDefaultBranch(repoId, branchName);
    }

    // @Get(':id/licenses')
    // @ApiBearerAuth()
    // @UseGuards(AccessTokenGuard)
    // async getLicensesByRepoId(
    //     @Param('id') repoId: string,
    //     @Query('page') page: string,
    //     @Query('limit') limit: string,
    //     @Req() req: Request,
    // ) {
    //     // return this.repositoryService.getLicensesByRepoId(
    //     //     req['user'].userId,
    //     //     repoId,
    //     //     +page,
    //     //     +limit,
    //     // );

    //     return this.repositoryService.getLicensesWithDependencyCount(
    //         req['user'].userId,
    //         repoId,
    //         +page,
    //         +limit,
    //     );
    // }

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

    // @Put('dependency-repo/make-active')
    // async makeActiveDependencyRepo() {
    //     return await this.repositoryService.updateAllDependencyRepo();
    // }
}
