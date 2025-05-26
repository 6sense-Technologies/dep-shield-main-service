import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import {
    License,
    LicenseDocument,
} from '../../database/license-schema/license.schema';
import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class LicensesService {
    constructor(
        @InjectModel(License.name)
        private licenseModel: Model<LicenseDocument>,
        @Inject(forwardRef(() => RepositoryService))
        private repositoryService: RepositoryService,
    ) {}

    async seed() {
        const jsonData = JSON.parse(fs.readFileSync('spdx.json', 'utf-8')); //spdx.json is added in the gitignore file. If needed get it from google drive.
        // Danger: Uncomment the following only if you need to seed.
        // await this.licenseModel.insertMany(jsonData);
        return 'Seeded licenses';
    }

    async getDetails(spdxId: string) {
        return await this.licenseModel.findOne({
            licenseId: spdxId.toUpperCase(),
        });
    }

    async getLicensesWithDependencyCount(
        userId: string,
        repoId: string,
        page: number,
        limit: number,
    ) {
        if (!page || !limit) {
            throw new BadRequestException('Page and limit are required');
        }

        return await this.repositoryService.getLicensesWithDependencyCount(
            userId,
            repoId,
            page,
            limit,
        );
    }
}
