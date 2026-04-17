import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminPatchPlatformLocaleDto {
  @ApiProperty({ description: 'When false, sellers cannot add new translations in this language' })
  @IsBoolean()
  isEnabled: boolean;
}
