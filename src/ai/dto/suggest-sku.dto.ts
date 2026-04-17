import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestSkuDto {
  @ApiProperty({ example: 'Ankara maxi dress' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  productName: string;

  @ApiPropertyOptional({ description: 'Short description for extra context' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionRaw?: string;
}
