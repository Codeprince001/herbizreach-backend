import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EnhanceProductImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  productId!: string;

  @ApiProperty({ description: 'Exact URL of an existing product image to replace with an AI-enhanced version' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  imageUrl!: string;
}
