import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsAppPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Square store photo for your page and social previews. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profileImageUrl?: string;

  @ApiPropertyOptional({ example: '#7c3aed' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Longer store bio shown on your public page' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showChatWidget?: boolean;
}
