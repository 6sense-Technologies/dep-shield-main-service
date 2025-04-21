import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy/jwt.strategy';
// import { appConfig } from 'src/configuration/app.config';
import { JWTRefreshTokenStrategy } from './strategy/jwt-refresh.strategy';

import { HttpModule } from '@nestjs/axios';
import { OTPSecretSchemaModule } from '../../database/otpsecret-schema/otp-secret-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from 'src/schemas/user.schema';
// import { SchemasModule } from 'src/schemas/schemas.module';

@Module({
    imports: [
        PassportModule,
        UserSchemaModule,
        OTPSecretSchemaModule,
        JwtModule.register({}),
        HttpModule,
        EmailModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JWTRefreshTokenStrategy,
        JwtService,
        EmailService,
    ],
})
export class AuthModule {}
