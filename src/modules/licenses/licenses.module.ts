import { Module } from '@nestjs/common';
import { LicenseSchemaModule } from '../../database/license-schema/license-schema.module';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
    imports: [LicenseSchemaModule],
    controllers: [LicensesController],
    providers: [LicensesService],
})
export class LicensesModule {}
