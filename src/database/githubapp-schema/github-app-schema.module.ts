import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GithubApp, GithubAppSchema } from './github-app.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GithubApp.name, schema: GithubAppSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class GithubAppSchemaModule {}
