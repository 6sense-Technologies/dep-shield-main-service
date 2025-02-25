import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto, LoginDto, VerifyEmailDto } from './dto/auth.dto';
import { User, UserDocument } from '../../schemas/user.schema'; // Adjust the path as needed
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { GithubService } from '../github/github.service';
import { EmailService } from '../email/email.service';
import { OTPSecret, OTPSecretDocument } from 'src/schemas/OTPSecret.schema';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private githubService: GithubService,
    private emailService: EmailService,
    @InjectModel(User.name) private userModel: Model<UserDocument>, // Inject Mongoose User model
    @InjectModel(OTPSecret.name)
    private otpSecretModel: Model<OTPSecretDocument>,
  ) {}

  async signup(dto: SignupDto) {
    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND),
    );

    const alreadyExists = await this.checkUser(dto.emailAddress);
    if (alreadyExists) {
      throw new ConflictException('User already exists');
    }

    const user = await this.userModel.create({
      displayName: dto.displayName,
      emailAddress: dto.emailAddress,
      password: hashedPassword,
    });
    const { accessToken, refreshToken } = this.generateTokens(
      user.id,
      user.emailAddress,
    ); // Use _id for Mongoose
    this.emailService.sendEmail(dto.emailAddress);
    await this.updateRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken, userInfo: this.sanitizeUser(user) };
  }

  async checkUser(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ emailAddress: email }).exec();
    return !!user; // Return true if user exists, false otherwise
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ emailAddress: dto.emailAddress, loginType: 'credential' })
      .exec();
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new NotFoundException('Invalid credentials');
    }

    const { accessToken, refreshToken } = this.generateTokens(
      user.id,
      user.emailAddress,
    ); // Use _id for Mongoose
    await this.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, userInfo: this.sanitizeUser(user) };
  }
  private sanitizeUser(user: any) {
    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
  }
  private generateTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign(
      { userId, email },
      { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRE },
    );
    const refreshToken = this.jwtService.sign(
      { userId, email },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_EXPIRE_REFRESH_TOKEN,
      },
    );
    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      parseInt(process.env.SALT_ROUND),
    );
    await this.userModel
      .findByIdAndUpdate(userId, { refreshToken: hashedRefreshToken })
      .exec();
  }

  async refreshTokens(refreshToken: string) {
    const decoded = this.jwtService.decode(refreshToken);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.userModel
      .findOne({ emailAddress: decoded.email })
      .exec();
    if (
      !user ||
      !(await this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = this.generateTokens(user.id, user.emailAddress); // Use _id for Mongoose
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }
  public async sendToken(emailAddress: string) {
    return this.emailService.sendEmail(emailAddress);
  }
  // Function to validate the code and check if it's within the 2-minute window
  public async verifyToken(verifyEmailDTO: VerifyEmailDto) {
    // Retrieve the latest entry from the database
    const tokenEntry = await this.otpSecretModel.findOne({
      emailAddress: verifyEmailDTO.emailAddress,
    });

    if (!tokenEntry) {
      throw new BadRequestException('Invalid Token');
    }

    // Check if the provided code matches the stored code
    if (tokenEntry.secret !== verifyEmailDTO.token) {
      throw new BadRequestException('Invalid Token');
    }

    // Check if the time difference is within the allowed 2 minutes (120 seconds)
    const currentTime = new Date();
    const timeDifference =
      (currentTime.getTime() - tokenEntry.updatedAt.getTime()) / 1000;
    // console.log(timeDifference);
    if (timeDifference > 120) {
      throw new BadRequestException('Token Expired');
    }
    const user = await this.userModel.findOne({
      emailAddress: verifyEmailDTO.emailAddress,
    });
    user.isVerified = true;
    await user.save();
    return { isValidated: true };
  }

  // async githubLogin(dto: GithubTokenDTO) {
  //   const response = await this.githubService.verifyAccessToken(
  //     dto.accessToken,
  //   );
  //   if (!response) {
  //     throw new UnauthorizedException('Invalid access token');
  //   }
  //   // await this.githubService.getAllRepos(dto.accessToken);
  //   const data = await this.githubService.getUserEmails(dto.accessToken);
  //   if (data) {
  //     let user = await this.userModel
  //       .findOne({ email: data.email, loginType: 'github' })
  //       .exec();

  //     if (!user) {
  //       user = await this.userModel.create({
  //         email: data.email,
  //         name: response.data.login,
  //         password: 'null',
  //         loginType: 'github',
  //         githubAccessToken: dto.accessToken,
  //       });
  //     } else {
  //       user.githubAccessToken = dto.accessToken;
  //       await user.save();
  //     }
  //     const userId = user.id;
  //     const { accessToken, refreshToken } = this.generateTokens(
  //       userId,
  //       data.email,
  //     );
  //     return {
  //       accessToken,
  //       refreshToken,
  //       userInfo: this.sanitizeUser(user),
  //     };
  //   }
  //   // const repo = await this.githubService.readPackageJson(
  //   //   dto.accessToken,
  //   //   allRepos[0].repo,
  //   // );
  //   // console.log(repo);
  // }
}
