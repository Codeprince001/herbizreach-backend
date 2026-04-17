import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SuggestInboxRepliesDto {
  @ApiProperty({ description: 'Conversation the store owner is replying in' })
  @IsUUID()
  conversationId: string;
}
