import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ImproveDescriptionDto {
  @ApiProperty({ description: 'Raw product description to improve' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  descriptionRaw: string;

  @ApiPropertyOptional({ description: 'Product name for context' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;
}
