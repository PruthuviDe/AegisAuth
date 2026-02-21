// =============================================================================
// Roles DTOs
// =============================================================================

import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'moderator', description: 'Role name (lowercase)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Can moderate content' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

export class AssignRoleDto {
  @ApiProperty({ example: 'moderator', description: 'Role name to assign' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}

export class RevokeRoleDto {
  @ApiProperty({ example: 'moderator', description: 'Role name to revoke' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
