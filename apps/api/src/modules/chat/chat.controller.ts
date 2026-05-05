import { Body, Controller, Get, MessageEvent, Post, Sse } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { SendMessageDto } from './dto/send-message.dto';
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
