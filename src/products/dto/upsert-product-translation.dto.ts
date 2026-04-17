import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranslationSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertProductTranslationDto {
  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Full product description shown in this language' })
  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  description: string;

  @ApiPropertyOptional({ enum: TranslationSource, default: TranslationSource.MANUAL })
  @IsOptional()
  @IsEnum(TranslationSource)
  nameSource?: TranslationSource;

  @ApiPropertyOptional({ enum: TranslationSource, default: TranslationSource.MANUAL })
  @IsOptional()
  @IsEnum(TranslationSource)
  descriptionSource?: TranslationSource;
}
