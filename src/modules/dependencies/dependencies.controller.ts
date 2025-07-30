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
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { DependenciesService } from './dependencies.service';
import { CreateDependencyDTO } from './dto/create-dependency.dto';

@Controller('dependencies')
export class DependenciesController {
    constructor(private readonly dependenciesService: DependenciesService) {}

    @Post('create')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    create(@Body() createDependencyDTO: CreateDependencyDTO) {
        return this.dependenciesService.create(createDependencyDTO);
    }

    @Get(':id')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getDetails(@Param('id') dependencyId: string) {
        return this.dependenciesService.getDependencyById(dependencyId);
    }

    @Get()
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getDependenciesByRepoId(
        @Query('repoId') repoId: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: Request,
        @Query('search') search?: string,
    ) {
        return this.dependenciesService.getDependenciesWithVulnerabilityCount(
            req['user'].userId,
            repoId,
            +page,
            +limit,
            search,
        );
    }
}
