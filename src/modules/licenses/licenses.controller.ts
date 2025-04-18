import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post('seed')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  create() {
    return this.licensesService.seed();
  }

  @Get(':spdxId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  getDetails(@Param('spdxId') spdxId: string) {
    return this.licensesService.getDetails(spdxId);
  }
}
