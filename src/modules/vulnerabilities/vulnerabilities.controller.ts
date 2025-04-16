import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { CreateVulnerabilityDTO } from './dto/create-vulnerability.dto';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
    constructor(
        private readonly vulnerabilitiesService: VulnerabilitiesService,
    ) {}

    @Post('create')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    create(@Body() createVulnerabilityDTO: CreateVulnerabilityDTO) {
        return this.vulnerabilitiesService.create(createVulnerabilityDTO);
    }

    @Post('scan-repo/:repoId')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    scanVulnerabilities(@Param('repoId') repoId: string, @Req() req: Request) {
        return this.vulnerabilitiesService.createVulnerability(
            req['user'].userId,
            repoId,
        );
    }

    @Get('cveId/:cveId')
    @ApiBearerAuth()
    @UseGuards(AccessTokenGuard)
    getByCVEId(@Param('cveId') cveId: string) {
        return this.vulnerabilitiesService.getByCVEId(cveId);
    }

    @Get('test')
    getVulnerability(@Param('cveId') cveId: string) {
        return this.vulnerabilitiesService.getVulnerabilitiesFromOsv(
            'axios',
            '0.19.2',
            'npm',
        );
    }
}
