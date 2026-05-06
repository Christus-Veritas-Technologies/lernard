import { Body, Controller, Get, MessageEvent, Param, Post, Sse, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { User } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import type { ChatUploadFile } from './chat-uploads';
import { MAX_CHAT_UPLOAD_SIZE } from './chat-uploads';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ProtectedRoute()
  @Get('conversations')
  async getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user);
  }

  @ProtectedRoute()
  @Get('conversations/:conversationId')
  async getConversation(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    return this.chatService.getConversation(user, conversationId);
  }

  @ProtectedRoute()
  @Get('attachments/lessons')
  async getAttachableLessons(@CurrentUser() user: User) {
    return this.chatService.getAttachableLessons(user);
  }

  @ProtectedRoute()
  @Post('attachments/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CHAT_UPLOAD_SIZE },
    }),
  )
  async uploadAttachment(
    @CurrentUser() user: User,
    @UploadedFile() file: ChatUploadFile | undefined,
  ) {
    return this.chatService.uploadAttachment(user, file);
  }

  @ProtectedRoute()
  @Post('message')
  async sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user, dto);
  }

  @ProtectedRoute()
  @Sse('message/stream')
  streamMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto): Observable<MessageEvent> {
    return this.chatService.streamMessage(user, dto);
  }
}
