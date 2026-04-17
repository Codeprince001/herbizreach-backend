import { ApiPropertyOptional } from '@nestjs/swagger';
import { TranslationSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertStoreTranslationDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string | null;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ApiPropertyOptional({ enum: TranslationSource })
  @IsOptional()
  @IsEnum(TranslationSource)
  taglineSource?: TranslationSource;

  @ApiPropertyOptional({ enum: TranslationSource })
  @IsOptional()
  @IsEnum(TranslationSource)
  descriptionSource?: TranslationSource;
}
