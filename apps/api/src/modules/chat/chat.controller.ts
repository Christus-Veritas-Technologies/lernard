import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ProtectedRoute()
  @Post('message')
  async sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @ProtectedRoute()
  @Get('conversations')
  async getConversations(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.chatService.getConversations(user.id, cursor, Math.min(limit!, 50));
  }

  @ProtectedRoute()
  @Get('conversations/:id')
  async getConversation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.getConversation(user.id, id);
  }

  @ProtectedRoute()
  @Delete('conversations/:id')
  async deleteConversation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.deleteConversation(user.id, id);
  }

  @ProtectedRoute()
  @Post('conversations/:id/to-lesson')
  async toLesson(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.toLesson(user.id, id);
  }

  @ProtectedRoute()
  @Post('conversations/:id/to-quiz')
  async toQuiz(@CurrentUser() user: User, @Param('id') id: string) {
    return this.chatService.toQuiz(user.id, id);
  }
}
