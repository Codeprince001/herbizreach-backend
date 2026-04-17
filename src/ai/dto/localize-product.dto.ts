import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class LocalizeProductDto {
  @ApiProperty()
  @IsUUID('4')
  productId: string;

  @ApiProperty({ example: 'yo', description: 'Platform locale code (not English)' })
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  localeCode: string;
}
