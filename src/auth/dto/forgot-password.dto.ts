import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
