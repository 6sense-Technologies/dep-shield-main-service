import { Module } from '@nestjs/common';
import { GithubAppService } from './github-app.service';
import { GithubAppController } from './github-app.controller';
import { HttpModule } from '@nestjs/axios';
import { SchemasModule } from 'src/schemas/schemas.module';

@Module({
  imports: [HttpModule, SchemasModule],
  providers: [GithubAppService],
  controllers: [GithubAppController],
  exports: [GithubAppService],
})
export class GithubAppModule {}
