// =============================================================================
// AuthController — Authentication Endpoints
// =============================================================================
// WHY HTTP-only cookies for refresh tokens:
// - Cannot be accessed by JavaScript (XSS-proof)
// - Automatically sent with requests (no client-side storage)
// - Secure + SameSite flags prevent CSRF
// Access tokens are returned in the response body for SPAs.
// =============================================================================

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto';
import { LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { JwtAuthGuard } from './guards';
import { COOKIE_NAMES } from '../../common/constants';

// WHY these re-imports: TypeScript's isolatedModules + emitDecoratorMetadata
// require types used in decorated parameters to be imported as values.
type Req = Request;
type Res = Response;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Stricter: 5 per minute
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() dto: CreateUserDto,
    @Req() req: Req,
    @Res({ passthrough: true }) res: Res,
  ) {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    const result = await this.authService.register(dto, metadata);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Stricter: 5 per minute
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Req,
    @Res({ passthrough: true }) res: Res,
  ) {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    const result = await this.authService.login(dto, metadata);

    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke all tokens)' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Res,
  ) {
    await this.authService.logout(req.user.sub);

    // Clear the refresh token cookie
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);

    return { message: 'Logged out successfully' };
  }

  // ── Refresh Token ────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @Req() req: Req,
    @Res({ passthrough: true }) res: Res,
  ) {
    // Get refresh token from cookie or body
    const refreshToken =
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token not provided',
      });
    }

    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    const tokens = await this.authService.refreshTokens(refreshToken, metadata);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  // ── Verify Email ─────────────────────────────────────────────────────────
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  // ── Resend Verification ───────────────────────────────────────────────────
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() dto: ForgotPasswordDto) {
    await this.authService.resendVerificationEmail(dto.email);
    return { message: 'If your email is unverified, a new verification link has been sent.' };
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute (abuse protection)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // WHY always same response: Prevents user enumeration
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using a valid token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully. Please sign in with your new password.' };
  }

  // ── Cookie Helper ────────────────────────────────────────────────────────
  // WHY these specific flags:
  // - httpOnly: Prevents XSS access
  // - secure: Only sent over HTTPS (disabled in dev for localhost)
  // - sameSite: 'lax' allows top-level navigation (OAuth redirects)
  // - path: '/api/auth' restricts cookie to auth endpoints only
  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
