import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
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
    const existingEntry = await this.otpSecretModel.findOne({ emailAddress });
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
    const user = await this.userModel.findOne({ emailAddress: emailAddress });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isVerified === true) {
      throw new BadRequestException('User is already verified');
    }
    const code = await this.generateAndStoreCode(emailAddress);
    const emailTemplate = EmailTemplate.userVerificationOTPEmailTemplate(
      user.displayName,
      code,
    );
    const response = await this.mailerService.sendMail({
      from: `6sense Projects ${this.configService.get('EMAIL_SENDER')}`,
      to: emailAddress,
      subject: `Please Verify your account for ${emailAddress}`,
      html: emailTemplate, //updated for gmail
    });
    return response;
  }
}
