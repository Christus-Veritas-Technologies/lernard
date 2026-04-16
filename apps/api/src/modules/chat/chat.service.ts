import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class ChatService {
  async sendMessage(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async getConversations(_userId: string, _cursor?: string, _limit?: number) {
    throw new NotImplementedException();
  }

  async getConversation(_userId: string, _id: string) {
    throw new NotImplementedException();
  }

  async deleteConversation(_userId: string, _id: string) {
    throw new NotImplementedException();
  }

  async toLesson(_userId: string, _conversationId: string) {
    throw new NotImplementedException();
  }

  async toQuiz(_userId: string, _conversationId: string) {
    throw new NotImplementedException();
  }
}
