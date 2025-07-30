import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OTPSecretSchemaModule } from '../../database/otpsecret-schema/otp-secret-schema.module';
import { UserSchemaModule } from '../../database/user-schema/user-schema.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
    imports: [
        OTPSecretSchemaModule,
        UserSchemaModule,
        ConfigModule.forRoot(), // Load environment variables
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get<string>(
                        'EMAIL_HOST',
                        'smtp.gmail.com',
                    ),
                    port: parseInt(
                        configService.get<string>('EMAIL_SERVICE_PORT', '587'),
                    ), // Ensure port is a number
                    secure:
                        configService.get<string>('EMAIL_SERVICE_PORT') ===
                        '465', // Secure only if using 465
                    auth: {
                        user: configService.get<string>('EMAIL_USERNAME'),
                        pass: configService.get<string>('EMAIL_PASSWORD'),
                    },
                    // Add connection timeout settings
                    connectionTimeout: 60000, // 60 seconds
                    greetingTimeout: 30000, // 30 seconds
                    socketTimeout: 60000, // 60 seconds
                },
                defaults: {
                    from: `"No Reply" <${configService.get<string>('EMAIL_SENDER')}>`, // Default sender
                },
            }),
        }),
    ],
    controllers: [EmailController],
    providers: [EmailService],
})
export class EmailModule {}
