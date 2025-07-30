import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EmailDTO, LoginDto, SignupDto, VerifyEmailDto } from './dto/auth.dto';
import { AccessTokenGuard } from './guards/accessToken.guard';
// import { RefreshTokenGuard } from './guards/refreshToken.guard';
import { RefreshTokenGuard } from './guards/refreshToken.guard';
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('signup')
    signup(@Body() dto: SignupDto) {
        return this.authService.signup(dto);
    }
    @Post('verify-email')
    verifyEmail(@Body() verifyEmailDTO: VerifyEmailDto) {
        return this.authService.verifyToken(verifyEmailDTO);
    }

    @Post('send-otp')
    sendOTP(@Body() dto: EmailDTO) {
        return this.authService.sendToken(dto.emailAddress);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // check env
    @Get('check-env')
    checkEnv() {
        return process.env;
    }

    @UseGuards(RefreshTokenGuard)
    @ApiBearerAuth()
    @Post('refresh')
    refreshTokens(@Req() req: Request) {
        const refreshToken: string = req['user'].refreshToken;

        return this.authService.refreshTokens(refreshToken);
    }
    // @Post('social-login')
    // socialLogin(@Body() dto: SocialLoginDto) {
    //   return this.authService.socialLogin(dto);
    // }

    // @Post('github-login')
    // githubLogin(@Body() dto: GithubTokenDTO) {
    //   return this.authService.githubLogin(dto);
    // }

    @UseGuards(AccessTokenGuard)
    @ApiBearerAuth()
    @Get('check-login')
    checkLogin() {
        return 'Logged In';
    }
}
