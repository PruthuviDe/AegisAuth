// =============================================================================
// AuthService — Core Authentication Logic
// =============================================================================
// WHY separated from UsersService:
// - AuthService orchestrates authentication flows (register → hash → token → email)
// - UsersService handles pure data operations
// - This separation prevents circular dependencies and keeps responsibilities clear
// =============================================================================

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { PrismaService } from '../../prisma';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from '../users/dto';
import { LoginDto } from './dto';
import { AuthResponse, TokenPair } from '../../common/interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
  async register(
    dto: CreateUserDto,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    // Create user (UsersService handles duplicate check + hashing)
    const user = await this.usersService.create(dto);

    // Generate email verification token
    const verifyToken = uuidv4();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.usersService.setEmailVerificationToken(
      user.id,
      verifyToken,
      verifyExpiry,
    );

    // Send verification email (non-blocking — failure logged, not thrown)
    this.emailService
      .sendEmailVerification(user.email, user.firstName || '', verifyToken)
      .catch((err) => this.logger.error('Failed to send verification email', err));

    // Generate auth tokens
    const tokens = await this.tokensService.generateTokenPair(
      user.id,
      user.email,
      user.roles,
      metadata,
    );

    // Log successful registration
    await this.logLoginAttempt({
      userId: user.id,
      email: user.email,
      success: true,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        roles: user.roles,
      },
      tokens,
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(
    dto: LoginDto,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    // Find user by email (includes passwordHash for verification)
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      await this.logLoginAttempt({
        email: dto.email,
        success: false,
        failReason: 'invalid_credentials',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.logLoginAttempt({
        userId: user.id,
        email: dto.email,
        success: false,
        failReason: 'account_disabled',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
      throw new UnauthorizedException('Account has been disabled');
    }

    // Verify password
    const isPasswordValid = await this.usersService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      await this.logLoginAttempt({
        userId: user.id,
        email: dto.email,
        success: false,
        failReason: 'invalid_password',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });
      // WHY same error as "user not found": Prevents user enumeration attacks
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = user.roles?.map((ur: any) => ur.role.name) || [];

    // Generate token pair
    const tokens = await this.tokensService.generateTokenPair(
      user.id,
      user.email,
      roles,
      metadata,
    );

    // Log successful login
    await this.logLoginAttempt({
      userId: user.id,
      email: user.email,
      success: true,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        roles,
      },
      tokens,
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.tokensService.revokeAllUserTokens(userId);
    this.logger.log(`User ${userId} logged out`);
  }

  // ── Refresh Tokens ───────────────────────────────────────────────────────
  async refreshTokens(
    refreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    return this.tokensService.refreshTokens(refreshToken, metadata);
  }

  // ── Verify Email ─────────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification token',
      );
    }

    await this.usersService.markEmailVerified(user.id);

    // Send confirmation email (non-blocking)
    this.emailService
      .sendAccountVerified(user.email, user.firstName || '')
      .catch((err) => this.logger.error('Failed to send account verified email', err));

    this.logger.log(`Email verified for user ${user.email}`);
  }
  // ── Resend Verification Email ─────────────────────────────────────────────
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Always return silently — no enumeration
    if (!user || !user.isActive) return;

    if (user.isEmailVerified) {
      // Already verified — nothing to do, still silent
      return;
    }

    // Issue a fresh token (extends the window for the user)
    const verifyToken = uuidv4();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.usersService.setEmailVerificationToken(
      user.id,
      verifyToken,
      verifyExpiry,
    );

    this.emailService
      .sendEmailVerification(user.email, user.firstName || '', verifyToken)
      .catch((err) =>
        this.logger.error('Failed to resend verification email', err),
      );

    this.logger.log(`Verification email resent to ${user.email}`);
  }
  // ── Forgot Password ─────────────────────────────────────────────────────
  // WHY always return OK even if email not found: Prevents user enumeration.
  // Attacker cannot tell if an account exists by inspecting the response.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      // Silently return — no information leakage
      this.logger.warn(`Forgot-password attempted for unknown/inactive email: ${email}`);
      return;
    }

    // Generate a short-lived reset token (1 hour)
    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.usersService.setPasswordResetToken(user.id, resetToken, resetExpiry);

    // Send email (non-blocking)
    this.emailService
      .sendPasswordReset(user.email, user.firstName || '', resetToken)
      .catch((err) => this.logger.error('Failed to send password reset email', err));

    this.logger.log(`Password reset token generated for ${user.email}`);
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Update password (UsersService handles hashing)
    await this.usersService.updatePassword(user.id, newPassword);

    // Clear reset token so it cannot be reused
    await this.usersService.clearPasswordResetToken(user.id);

    // Revoke all existing sessions — force re-login with new password
    await this.tokensService.revokeAllUserTokens(user.id);

    this.logger.log(`Password reset successful for user ${user.email}`);
  }

  // ── Login Attempt Logging ────────────────────────────────────────────────
  private async logLoginAttempt(data: {
    userId?: string;
    email: string;
    success: boolean;
    failReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.loginLog.create({ data });
    } catch (error) {
      // Don't let logging failures break auth flow
      this.logger.error('Failed to log login attempt', error);
    }
  }
}
