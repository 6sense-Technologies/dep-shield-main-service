import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OTPSecret, OTPSecretSchema } from './otp-secret.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OTPSecret.name, schema: OTPSecretSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class OTPSecretSchemaModule {}
