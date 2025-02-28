import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { Repository, RepositorySchema } from './repository.schema';
import { OTPSecret, OTPSecretSchema } from './OTPSecret.schema';
import { GithubApp, GithubAppSchema } from './GithubApp.schema';
@Global() // Made this module global its not memory efficient will change later
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: GithubApp.name, schema: GithubAppSchema },
    ]),
    MongooseModule.forFeature([
      { name: Repository.name, schema: RepositorySchema },
    ]),
    MongooseModule.forFeature([
      { name: OTPSecret.name, schema: OTPSecretSchema },
    ]),
  ],
  exports: [MongooseModule], // Export MongooseModule to make it available globally
})
export class SchemasModule {}
