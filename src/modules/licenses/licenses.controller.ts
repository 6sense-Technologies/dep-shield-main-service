import {
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
import { LicensesService } from './licenses.service';

@Controller('licenses')
export class LicensesController {
    constructor(private readonly licensesService: LicensesService) {}

    @Post('seed')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    create() {
        return this.licensesService.seed();
    }

    @Get(':licenseId')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getLicenseById(@Param('licenseId') licenseId: string) {
        return this.licensesService.getLicenseById(licenseId);
    }

    @Get('spdx/:spdxId')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getLicenseBySpdxId(@Param('spdxId') spdxId: string) {
        return this.licensesService.getLicenseBySpdxId(spdxId);
    }

    @Get()
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    async getLicensesByRepoId(
        @Query('repoId') repoId: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: Request,
    ) {
        return this.licensesService.getLicensesWithDependencyCount(
            req['user'].userId,
            repoId,
            +page,
            +limit,
        );
    }
}
