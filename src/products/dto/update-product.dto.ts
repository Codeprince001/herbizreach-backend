import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : typeof value === 'string' ? parseFloat(value) : value,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionRaw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  descriptionAi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captionAi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true || value === '1';
  })
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Replace category links (empty array clears)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t.startsWith('[')) {
        try {
          return JSON.parse(t) as string[];
        } catch {
          return [];
        }
      }
      return t.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true || value === '1';
  })
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description:
      'Reorder or remove images; each URL must already belong to this product. Omit to leave gallery unchanged.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t.startsWith('[')) {
        try {
          return JSON.parse(t) as string[];
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  })
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  imageUrls?: string[];
}
