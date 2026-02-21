// =============================================================================
// RolesService — Role & Permission Management
// =============================================================================
// WHY this service:
// - Centralises all role assignment, revocation, and seeding logic.
// - Keeps AuthService/UsersService clean — they delegate role queries here.
// - Makes it easy to extend with permission checks in Phase 6+.
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateRoleDto } from './dto/roles.dto';

// Default roles seeded on application start
export const DEFAULT_ROLES = [
  { name: 'user', description: 'Default user role — basic access' },
  { name: 'admin', description: 'Administrator — full access' },
  { name: 'moderator', description: 'Moderator — content moderation access' },
];

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Seed Default Roles ───────────────────────────────────────────────────
  // Called once on application bootstrap to ensure roles exist.
  async seedDefaultRoles(): Promise<void> {
    for (const role of DEFAULT_ROLES) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }
    this.logger.log(`Default roles seeded: ${DEFAULT_ROLES.map((r) => r.name).join(', ')}`);
  }

  // ── Create Role ──────────────────────────────────────────────────────────
  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.toLowerCase(),
        description: dto.description,
      },
    });

    this.logger.log(`Role created: ${role.name}`);
    return role;
  }

  // ── List All Roles ───────────────────────────────────────────────────────
  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, permissions: true } },
      },
    });
  }

  // ── Assign Role to User ──────────────────────────────────────────────────
  async assignRole(userId: string, roleName: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toLowerCase() },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    // Check if already assigned
    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: role.id } },
    });
    if (existing) {
      throw new ConflictException(`User already has role '${roleName}'`);
    }

    await this.prisma.userRole.create({
      data: { userId, roleId: role.id },
    });

    this.logger.log(`Role '${roleName}' assigned to user ${userId}`);
    return { message: `Role '${roleName}' assigned successfully` };
  }

  // ── Revoke Role from User ────────────────────────────────────────────────
  async revokeRole(userId: string, roleName: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toLowerCase() },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    // Prevent revoking the last 'user' role (users must keep at least one role)
    if (roleName.toLowerCase() === 'user') {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId },
      });
      if (userRoles.length <= 1) {
        throw new BadRequestException(
          'Cannot revoke the base user role — users must retain at least one role',
        );
      }
    }

    const deleted = await this.prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`User does not have role '${roleName}'`);
    }

    this.logger.log(`Role '${roleName}' revoked from user ${userId}`);
    return { message: `Role '${roleName}' revoked successfully` };
  }

  // ── Get User's Roles ─────────────────────────────────────────────────────
  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    return userRoles.map((ur) => ({
      name: ur.role.name,
      description: ur.role.description,
      assignedAt: ur.assignedAt,
    }));
  }

  // ── Delete Role ──────────────────────────────────────────────────────────
  async deleteRole(roleName: string) {
    if (['user', 'admin'].includes(roleName.toLowerCase())) {
      throw new BadRequestException(`Cannot delete system role '${roleName}'`);
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toLowerCase() },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    await this.prisma.role.delete({ where: { id: role.id } });

    this.logger.log(`Role '${roleName}' deleted`);
    return { message: `Role '${roleName}' deleted successfully` };
  }
}
