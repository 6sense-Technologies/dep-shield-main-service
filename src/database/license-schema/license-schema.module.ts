import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { License, LicenseSchema } from './license.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: License.name, schema: LicenseSchema }]),
  ],
  exports: [MongooseModule],
})
export class LicenseSchemaModule {}
