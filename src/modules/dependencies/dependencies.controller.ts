import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { DependenciesService } from './dependencies.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
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
        return this.dependenciesService.getDetails(dependencyId);
    }

    @Get()
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getDependenciesByRepoId(@Query('repoId') repoId: string) {
        return this.dependenciesService.getDependenciesByRepoId(repoId);
    }
}
