import { Module } from '@nestjs/common';
import { GithubAppService } from './github-app.service';
import { GithubAppController } from './github-app.controller';
import { HttpModule } from '@nestjs/axios';
import { GithubAppSchemaModule } from '../../database/githubapp-schema/github-app-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { RepositorySchemaModule } from '../../database/repository-schema/repository-schema.module';

@Module({
    imports: [
        HttpModule,
        GithubAppSchemaModule,
        UserSchemaModule,
        RepositorySchemaModule,
    ],
    providers: [GithubAppService],
    controllers: [GithubAppController],
    exports: [GithubAppService],
})
export class GithubAppModule {}
