import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthService } from './auth.service';
// import { appConfig } from 'src/configuration/app.config';
import { JWTRefreshTokenStrategy } from './strategy/jwt-refresh.strategy';

import { HttpModule } from '@nestjs/axios';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';
// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from 'src/schemas/user.schema';
// import { SchemasModule } from 'src/schemas/schemas.module';

@Module({
  imports: [
    PassportModule,
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET,
    //   signOptions: { expiresIn: process.env.JWT_EXPIRE },
    // }),
    // MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // SchemasModule,
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
