import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { OTPSecret } from '../../database/otpsecret-schema/otp-secret.schema';
import { User } from '../../database/user-schema/user.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { EmailTemplate } from './templates/otp-email.template';

jest.mock('./templates/otp-email.template');

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let configService: ConfigService;
  let otpSecretModel: Model<OTPSecret>;
  let userModel: Model<User>;

  const mockUser = {
    emailAddress: 'test@example.com',
    displayName: 'Test User',
    isVerified: false,
  };

  const mockVerifiedUser = {
    emailAddress: 'verified@example.com',
    displayName: 'Verified User',
    isVerified: true,
  };

  const mockOtpSecret = {
    emailAddress: 'test@example.com',
    secret: '123456',
    timestamp: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue({
              messageId: 'mock-message-id',
              accepted: ['test@example.com'],
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'EMAIL_SENDER') {
                return 'noreply@example.com';
              }
              return null;
            }),
          },
        },
        {
          provide: getModelToken(OTPSecret.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);
    otpSecretModel = module.get<Model<OTPSecret>>(
      getModelToken(OTPSecret.name),
    );
    userModel = module.get<Model<User>>(getModelToken(User.name));

    // Mock the random code generation to return a predictable value
    jest.spyOn(service as any, 'generateCode').mockReturnValue('123456');

    // Mock the EmailTemplate.userVerificationOTPEmailTemplate
    (
      EmailTemplate.userVerificationOTPEmailTemplate as jest.Mock
    ).mockReturnValue('<html>Email template content</html>');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCode', () => {
    it('should generate a 6-digit code', () => {
      console.log(configService);
      // Reset the mock to use the actual implementation
      jest.spyOn(service as any, 'generateCode').mockRestore();

      const code = (service as any).generateCode();

      // Check that the code is a string
      expect(typeof code).toBe('string');

      // Check that the code has 6 digits
      expect(code.length).toBe(6);

      // Check that the code contains only digits
      expect(/^\d+$/.test(code)).toBe(true);
    });
  });

  describe('generateAndStoreCode', () => {
    it('should update existing OTP entry if one exists', async () => {
      jest
        .spyOn(otpSecretModel, 'findOne')
        .mockResolvedValue(mockOtpSecret as any);

      const result = await (service as any).generateAndStoreCode(
        'test@example.com',
      );

      expect(otpSecretModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(mockOtpSecret.secret).toBe('123456');
      expect(mockOtpSecret.save).toHaveBeenCalled();
      expect(result).toBe('123456');
    });

    it('should create new OTP entry if one does not exist', async () => {
      jest.spyOn(otpSecretModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(otpSecretModel, 'create').mockResolvedValue({
        emailAddress: 'test@example.com',
        secret: '123456',
        timestamp: expect.any(Date),
      } as any);

      const result = await (service as any).generateAndStoreCode(
        'test@example.com',
      );

      expect(otpSecretModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(otpSecretModel.create).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
        secret: '123456',
        timestamp: expect.any(Date),
      });
      expect(result).toBe('123456');
    });
  });

  describe('sendEmail', () => {
    it('should send an email with OTP code to an unverified user', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(service as any, 'generateAndStoreCode')
        .mockResolvedValue('123456');

      const result = await service.sendEmail('test@example.com');

      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(service['generateAndStoreCode']).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(
        EmailTemplate.userVerificationOTPEmailTemplate,
      ).toHaveBeenCalledWith('Test User', '123456');
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        from: '6sense Projects noreply@example.com',
        to: 'test@example.com',
        subject: 'Please Verify your account for test@example.com',
        html: '<html>Email template content</html>',
      });
      expect(result).toEqual({
        messageId: 'mock-message-id',
        accepted: ['test@example.com'],
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.sendEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'nonexistent@example.com',
      });
    });

    it('should throw BadRequestException if user is already verified', async () => {
      jest
        .spyOn(userModel, 'findOne')
        .mockResolvedValue(mockVerifiedUser as any);

      await expect(service.sendEmail('verified@example.com')).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'verified@example.com',
      });
    });

    it('should handle mailer service errors', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(service as any, 'generateAndStoreCode')
        .mockResolvedValue('123456');
      jest
        .spyOn(mailerService, 'sendMail')
        .mockRejectedValue(new Error('Failed to send email'));

      await expect(service.sendEmail('test@example.com')).rejects.toThrow(
        'Failed to send email',
      );

      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(service['generateAndStoreCode']).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  // Test for edge cases
  describe('edge cases', () => {
    it('should handle database errors when finding user', async () => {
      jest
        .spyOn(userModel, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.sendEmail('test@example.com')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle database errors when generating and storing code', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(service as any, 'generateAndStoreCode')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.sendEmail('test@example.com')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle errors from email template generation', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(service as any, 'generateAndStoreCode')
        .mockResolvedValue('123456');
      (
        EmailTemplate.userVerificationOTPEmailTemplate as jest.Mock
      ).mockImplementation(() => {
        throw new Error('Template generation error');
      });

      await expect(service.sendEmail('test@example.com')).rejects.toThrow(
        'Template generation error',
      );
    });
  });
});
