import { MailerService } from '@nestjs-modules/mailer';
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OTPSecret } from '../../database/otpsecret-schema/otp-secret.schema';
import { User } from '../../database/user-schema/user.schema';
import { EmailTemplate } from './templates/otp-email.template';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    constructor(
        private configService: ConfigService,
        @InjectModel(OTPSecret.name)
        private readonly otpSecretModel: Model<OTPSecret>,
        private readonly mailerService: MailerService,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
    ) {}
    // Function to generate a 6-digit code
    private generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    private async generateAndStoreCode(emailAddress: string) {
        const code = this.generateCode();
        const currentTime = new Date();
        // Check if an entry for the email already exists
        const existingEntry = await this.otpSecretModel.findOne({
            emailAddress,
        });
        if (existingEntry) {
            // Update the code and timestamp if an entry exists
            existingEntry.secret = code;
            await existingEntry.save();
        } else {
            // Create a new entry if none exists
            await this.otpSecretModel.create({
                emailAddress: emailAddress,
                secret: code,
                timestamp: currentTime,
            });
        }
        return code;
    }
    // Function to send the email with the 6-digit code
    public async sendEmail(emailAddress: string) {
        try {
            console.log('emailAddress', emailAddress);
            const user = await this.userModel.findOne({
                emailAddress: emailAddress,
            });
            console.log(user);
            if (!user) {
                throw new NotFoundException('User not found');
            }
            if (user.isVerified === true) {
                throw new BadRequestException('User is already verified');
            }
            const code = await this.generateAndStoreCode(emailAddress);
            const emailTemplate =
                EmailTemplate.userVerificationOTPEmailTemplate(
                    user.displayName,
                    code,
                );

            // Log SMTP configuration for debugging
            this.logger.log(`Attempting to send email to: ${emailAddress}`);
            this.logger.log(
                `SMTP Host: ${this.configService.get('EMAIL_HOST')}`,
            );
            this.logger.log(
                `SMTP Port: ${this.configService.get('EMAIL_SERVICE_PORT')}`,
            );

            const response = await this.mailerService.sendMail({
                from: `6sense Projects ${this.configService.get('EMAIL_SENDER')}`,
                to: emailAddress,
                subject: `Please Verify your account for ${emailAddress}`,
                html: emailTemplate,
            });
            console.log(response);
            return response;
        } catch (error) {
            this.logger.error(
                `Failed to send email to ${emailAddress}:`,
                error,
            );

            // Provide more specific error messages
            if (error.code === 'ETIMEDOUT') {
                throw new Error(
                    `SMTP connection timeout. Please check your email configuration and network connectivity.`,
                );
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error(
                    `SMTP connection refused. Please verify the email host and port settings.`,
                );
            } else if (error.code === 'EAUTH') {
                throw new Error(
                    `SMTP authentication failed. Please check your email username and password.`,
                );
            }

            throw error;
        }
    }

    async sendRepositoryShareEmail(
        emailAddress: string,
        repositoryName: string,
        userName: string,
    ) {
        const emailTemplate = EmailTemplate.repositoryShareEmailTemplate(
            userName,
            repositoryName,
        );
        const response = await this.mailerService.sendMail({
            from: `6sense Projects ${this.configService.get('EMAIL_SENDER')}`,
            to: emailAddress,
            subject: `You have been invited to a repository`,
            html: emailTemplate,
        });
        return response;
    }
}
