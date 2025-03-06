// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { GithubModule } from './modules/repository/repository.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { EmailModule } from './modules/email/email.module';
import { EmailService } from './modules/email/email.service';
import { GithubAppModule } from './modules/github-app/github-app.module';
import { GithubAppSchemaModule } from './database/githubapp-schema/github-app-schema.module';
import { UserSchemaModule } from './database/user-schema/user-schema.module';
import { OTPSecretSchemaModule } from './database/otpsecret-schema/otp-secret-schema.module';
import { RepositorySchemaModule } from './database/repository-schema/repository-schema.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }), // Load environment variables
    MongooseModule.forRoot(process.env.MONGODB_URI), // Mongoose connection
    //Service Modules
    AuthModule,
    GithubModule,
    EmailModule,
    GithubAppModule,
    //Schema Related Modules
    GithubAppSchemaModule,
    UserSchemaModule,
    OTPSecretSchemaModule,
    RepositorySchemaModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, JwtService, EmailService],
})
export class AppModule {}
