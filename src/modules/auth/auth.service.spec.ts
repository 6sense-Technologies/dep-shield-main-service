import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../database/user-schema/user.schema';
import { OTPSecret } from '../../database/otpsecret-schema/otp-secret.schema';
import { SignupDto, LoginDto, VerifyEmailDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Model } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let emailService: EmailService;
  let userModel: Model<User>;
  let otpSecretModel: Model<OTPSecret>;

  // Mock data
  const mockUser = {
    id: 'user-id',
    emailAddress: 'test@example.com',
    displayName: 'Test User',
    password: 'hashedPassword',
    isVerified: false,
    toObject: jest.fn().mockReturnValue({
      id: 'user-id',
      emailAddress: 'test@example.com',
      displayName: 'Test User',
      password: 'hashedPassword',
      isVerified: false,
    }),
    save: jest.fn(),
  };

  const mockOtpSecret = {
    emailAddress: 'test@example.com',
    secret: '123456',
    updatedAt: new Date(),
  };

  // Mock functions
  const mockJwtService = {
    sign: jest.fn().mockImplementation(() => 'token'),
    decode: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(true),
  };

  const mockUserModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    exec: jest.fn(),
  };

  const mockOtpSecretModel = {
    findOne: jest.fn(),
  };

  // Helper function to create mock findOne
  const createMockFindOne = (returnValue) => ({
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(OTPSecret.name),
          useValue: mockOtpSecretModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    otpSecretModel = module.get<Model<OTPSecret>>(
      getModelToken(OTPSecret.name),
    );

    // Configure environment variables for testing
    process.env.SALT_ROUND = '10';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE = '1h';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRE_REFRESH_TOKEN = '7d';

    // Mock bcrypt
    jest
      .spyOn(bcrypt, 'hash')
      .mockImplementation(() => Promise.resolve('hashedPassword'));
    jest
      .spyOn(bcrypt, 'compare')
      .mockImplementation(() => Promise.resolve(true));

    // Mock service methods that are commonly used
    jest.spyOn(service as any, 'generateTokens').mockReturnValue({
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    });
    jest
      .spyOn(service as any, 'updateRefreshToken')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      displayName: 'Test User',
      emailAddress: 'test@example.com',
      password: 'password123',
    };

    it('should create a new user and return tokens', async () => {
      // Setup
      jest.spyOn(service, 'checkUser').mockResolvedValue(false);
      jest.spyOn(userModel, 'create').mockResolvedValue(mockUser as any);

      // Execute
      const result = await service.signup(signupDto);

      // Assert
      expect(service.checkUser).toHaveBeenCalledWith('test@example.com');
      expect(userModel.create).toHaveBeenCalledWith({
        displayName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'hashedPassword',
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        userInfo: expect.any(Object),
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      // Setup
      jest.spyOn(service, 'checkUser').mockResolvedValue(true);

      // Assert
      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('checkUser', () => {
    it('should return true if user exists', async () => {
      // Setup
      mockUserModel.findOne.mockReturnValue(createMockFindOne(mockUser));

      // Execute
      const result = await service.checkUser('test@example.com');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(result).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      // Setup
      mockUserModel.findOne.mockReturnValue(createMockFindOne(null));

      // Execute
      const result = await service.checkUser('test@example.com');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      emailAddress: 'test@example.com',
      password: 'password123',
    };

    it('should return tokens and user info on successful login', async () => {
      // Setup
      mockUserModel.findOne.mockReturnValue(createMockFindOne(mockUser));

      // Execute
      const result = await service.login(loginDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
        loginType: 'credential',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        userInfo: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      // Setup
      mockUserModel.findOne.mockReturnValue(createMockFindOne(null));

      // Assert
      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if password is incorrect', async () => {
      // Setup
      mockUserModel.findOne.mockReturnValue(createMockFindOne(mockUser));
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

      // Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens if refresh token is valid', async () => {
      // Setup
      const decoded = { email: 'test@example.com', userId: 'user-id' };
      mockJwtService.decode.mockReturnValue(decoded);
      mockJwtService.verify.mockReturnValue(true);
      mockUserModel.findOne.mockReturnValue(createMockFindOne(mockUser));

      // Execute
      const result = await service.refreshTokens('validRefreshToken');

      // Assert
      expect(jwtService.decode).toHaveBeenCalledWith('validRefreshToken');
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(jwtService.verify).toHaveBeenCalledWith('validRefreshToken', {
        secret: 'test-refresh-secret',
      });
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });

    it('should throw UnauthorizedException if token cannot be decoded', async () => {
      // Setup
      mockJwtService.decode.mockReturnValue(null);

      // Assert
      await expect(service.refreshTokens('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      // Setup
      const decoded = { email: 'test@example.com', userId: 'user-id' };
      mockJwtService.decode.mockReturnValue(decoded);
      mockUserModel.findOne.mockReturnValue(createMockFindOne(null));

      // Assert
      await expect(service.refreshTokens('validRefreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      // Setup
      const decoded = { email: 'test@example.com', userId: 'user-id' };
      mockJwtService.decode.mockReturnValue(decoded);
      mockUserModel.findOne.mockReturnValue(createMockFindOne(mockUser));
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Assert
      await expect(service.refreshTokens('validRefreshToken')).rejects.toThrow(
        Error,
      );
    });
  });

  describe('sendToken', () => {
    it('should call emailService.sendEmail with the provided email', async () => {
      // Execute
      await service.sendToken('test@example.com');

      // Assert
      expect(emailService.sendEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('verifyToken', () => {
    const verifyEmailDto: VerifyEmailDto = {
      emailAddress: 'test@example.com',
      token: '123456',
    };

    it('should verify token and mark user as verified if valid', async () => {
      // Setup
      // Mock current time to be within the 2-minute window
      const mockCurrentTime = new Date();
      const mockTokenTime = new Date(mockCurrentTime.getTime() - 60 * 1000); // 1 minute ago
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockCurrentTime as any);

      mockOtpSecretModel.findOne.mockResolvedValue({
        ...mockOtpSecret,
        updatedAt: mockTokenTime,
      });
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Execute
      const result = await service.verifyToken(verifyEmailDto);

      // Assert
      expect(otpSecretModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
      });
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ isValidated: true });

      // Cleanup
      jest.restoreAllMocks();
    });

    it('should throw BadRequestException if token entry does not exist', async () => {
      // Setup
      mockOtpSecretModel.findOne.mockResolvedValue(null);

      // Assert
      await expect(service.verifyToken(verifyEmailDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if provided token does not match stored token', async () => {
      // Setup
      mockOtpSecretModel.findOne.mockResolvedValue({
        ...mockOtpSecret,
        secret: '654321', // Different from the provided token
      });

      // Assert
      await expect(service.verifyToken(verifyEmailDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired (older than 2 minutes)', async () => {
      // Setup
      // Mock current time to make the token older than 2 minutes
      const mockCurrentTime = new Date();
      const mockTokenTime = new Date(mockCurrentTime.getTime() - 121 * 1000); // 2 minutes and 1 second ago
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockCurrentTime as any);

      mockOtpSecretModel.findOne.mockResolvedValue({
        ...mockOtpSecret,
        updatedAt: mockTokenTime,
      });

      // Assert
      await expect(service.verifyToken(verifyEmailDto)).rejects.toThrow(
        BadRequestException,
      );

      // Cleanup
      jest.restoreAllMocks();
    });
  });
});
