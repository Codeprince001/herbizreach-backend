import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'FCM registration token from the client SDK' })
  @IsString()
  @MinLength(10)
  token!: string;
}
