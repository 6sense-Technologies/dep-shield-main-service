import { Module } from '@nestjs/common';
import { GithubAppService } from './github-app.service';
import { GithubAppController } from './github-app.controller';
import { HttpModule } from '@nestjs/axios';
import { GithubAppSchemaModule } from 'src/database/githubapp-schema/github-app-schema.module';
import { UserSchemaModule } from 'src/database/user-schema/user-schema.module';

@Module({
  imports: [HttpModule, GithubAppSchemaModule, UserSchemaModule],
  providers: [GithubAppService],
  controllers: [GithubAppController],
  exports: [GithubAppService],
})
export class GithubAppModule {}
