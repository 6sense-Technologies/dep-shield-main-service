import { Get, Injectable, Param, Post, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  License,
  LicenseDocument,
} from 'src/database/license-schema/license.schema';
import * as fs from 'fs';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';

@Injectable()
export class LicensesService {
  constructor(
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
  ) {}

  async seed() {
    const jsonData = JSON.parse(fs.readFileSync('spdx.json', 'utf-8')); //spdx.json is added in the gitignore file. If needed get it from google drive.
    // Danger: Uncomment the following only if you need to seed. 
    // await this.licenseModel.insertMany(jsonData); 
    return 'Seeded licenses';
  }

  async getDetails(spdxId: string) {
    return await this.licenseModel.findOne({ licenseId: spdxId.toUpperCase() });
  }
}
