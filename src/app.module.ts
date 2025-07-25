// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AuthService } from './modules/auth/auth.service';
import { RepositoryModule } from './modules/repository/repository.module';

import { BullModule } from '@nestjs/bullmq';
import { DependencySchemaModule } from './database/dependency-schema/dependency-schema.module';
import { GithubAppSchemaModule } from './database/githubapp-schema/github-app-schema.module';
import { LicenseSchemaModule } from './database/license-schema/license-schema.module';
import { OTPSecretSchemaModule } from './database/otpsecret-schema/otp-secret-schema.module';
import { RepositorySchemaModule } from './database/repository-schema/repository-schema.module';
import { UserSchemaModule } from './database/user-schema/user-schema.module';
import { VulnerabilitySchemaModule } from './database/vulnerability-schema/vulnerability-schema.module';
import { DependenciesModule } from './modules/dependencies/dependencies.module';
import { EmailModule } from './modules/email/email.module';
import { EmailService } from './modules/email/email.service';
import { GithubAppModule } from './modules/github-app/github-app.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { VulnerabilitiesModule } from './modules/vulnerabilities/vulnerabilities.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }), // Load environment variables
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    url: configService.get<string>('REDIS_URL'),
                },
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                return {
                    uri: configService.get<string>('MONGODB_URI'),
                };
            },
            inject: [ConfigService],
        }),
        // MongooseModule.forRoot(process.env.MONGODB_URI), // Mongoose connection
        //Service Modules
        AuthModule,
        RepositoryModule,
        EmailModule,
        GithubAppModule,
        DependenciesModule,
        LicensesModule,
        VulnerabilitiesModule,
        //Schema Related Modules
        GithubAppSchemaModule,
        UserSchemaModule,
        OTPSecretSchemaModule,
        RepositorySchemaModule,
        DependencySchemaModule,
        LicenseSchemaModule,
        VulnerabilitySchemaModule,
    ],
    controllers: [AppController, AuthController],
    providers: [AppService, AuthService, JwtService, EmailService],
})
export class AppModule {}
