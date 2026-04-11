import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class StartConversationDto {
  @ApiProperty({ example: 'favour-fashion' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  storeSlug: string;

  @ApiPropertyOptional({
    description: 'When set, links this chat to a published product on the store (e.g. from product page).',
  })
  @IsOptional()
  @IsUUID('4')
  productId?: string;
}
