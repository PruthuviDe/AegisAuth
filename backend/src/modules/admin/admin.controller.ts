// =============================================================================
// AdminController — Admin-Only API Endpoints
// =============================================================================
// All routes in this controller require the 'admin' role.
// Authentication: JwtAuthGuard → RolesGuard (both applied at controller level)
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { AssignRoleDto, CreateRoleDto, RevokeRoleDto } from '../roles/dto/roles.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Toggle user active/inactive status' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async toggleUserStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleActiveStatus(id);
  }

  @Get('users/:id/roles')
  @ApiOperation({ summary: "Get user's assigned roles" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.getUserRoles(id);
  }

  @Post('users/:id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.assignRole(id, dto.roleName);
  }

  @Delete('users/:id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a role from a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async revokeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeRoleDto,
  ) {
    return this.rolesService.revokeRole(id, dto.roleName);
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: 'List all roles' })
  async listRoles() {
    return this.rolesService.findAll();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Delete('roles/:name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a role (system roles protected)' })
  @ApiParam({ name: 'name', description: 'Role name' })
  async deleteRole(@Param('name') name: string) {
    return this.rolesService.deleteRole(name);
  }
}
