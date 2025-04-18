import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseSchemaModule } from 'src/database/license-schema/license-schema.module';

@Module({
  imports: [LicenseSchemaModule],
  controllers: [LicensesController],
  providers: [LicensesService],
})
export class LicensesModule {}
