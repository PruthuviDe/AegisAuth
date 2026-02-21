// =============================================================================
// UsersService — User CRUD + Query Operations
// =============================================================================
// WHY separate from AuthService: Users module handles data operations (CRUD).
// Auth module handles authentication flows (login, register, tokens).
// This separation means UserService can be reused by admin, profile, or
// other modules without pulling in auth logic.
// =============================================================================

import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Create User ──────────────────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    // Check for existing user
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // WHY Argon2id: It combines Argon2i (side-channel resistant) and Argon2d
    // (GPU-resistant). The recommended variant for password hashing.
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64MB — makes GPU attacks expensive
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 parallel threads
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        // Assign default "user" role
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: 'user' },
                create: { name: 'user', description: 'Default user role' },
              },
            },
          },
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    this.logger.log(`User created: ${user.email}`);
    return this.sanitizeUser(user);
  }

  // ── Find by ID ───────────────────────────────────────────────────────────
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  // ── Find by Email (internal — includes passwordHash for auth) ────────────
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: { include: { role: true } },
      },
    });
  }

  // ── Update User ──────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id); // Throws if not found

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: {
        roles: { include: { role: true } },
      },
    });

    return this.sanitizeUser(user);
  }

  // ── Find All Users (for admin) ───────────────────────────────────────────
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          roles: { include: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((user) => this.sanitizeUser(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Verify Password ─────────────────────────────────────────────────────
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  // ── Update Password ─────────────────────────────────────────────────────
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // ── Mark Email as Verified ───────────────────────────────────────────────
  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });
  }

  // ── Set Email Verification Token ─────────────────────────────────────────
  async setEmailVerificationToken(
    userId: string,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: token,
        emailVerifyExpiry: expiry,
      },
    });
  }

  // ── Set Password Reset Token ─────────────────────────────────────────────
  async setPasswordResetToken(
    userId: string,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      },
    });
  }

  // ── Clear Password Reset Token ───────────────────────────────────────────
  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
  }

  // ── Sanitize User (strip sensitive fields) ───────────────────────────────
  // WHY: Never return passwordHash, tokens, etc. to the client.
  private sanitizeUser(user: any) {
    const { passwordHash, emailVerifyToken, emailVerifyExpiry, passwordResetToken, passwordResetExpiry, ...sanitized } = user;

    return {
      ...sanitized,
      roles: user.roles?.map((ur: any) => ur.role.name) || [],
    };
  }
}
