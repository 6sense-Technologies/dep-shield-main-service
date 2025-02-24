import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { GithubUrl, GithubUrlSchema } from './github-url.schema';
import { OTPSecret, OTPSecretSchema } from './OTPSecret.schema';
@Global() // Made this module global its not memory efficient will change later
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: GithubUrl.name, schema: GithubUrlSchema },
    ]),
    MongooseModule.forFeature([
      { name: OTPSecret.name, schema: OTPSecretSchema },
    ]),
  ],
  exports: [MongooseModule], // Export MongooseModule to make it available globally
})
export class SchemasModule {}
