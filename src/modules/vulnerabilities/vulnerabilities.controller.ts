import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { CreateVulnerabilityDTO } from './dto/create-vulnerability.dto';

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
}
