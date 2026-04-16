import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class LessonsService {
  async generate(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async getById(_userId: string, _id: string) {
    throw new NotImplementedException();
  }

  async sectionCheck(_userId: string, _id: string, _dto: any) {
    throw new NotImplementedException();
  }

  async complete(_userId: string, _id: string) {
    throw new NotImplementedException();
  }

  async getHistory(_userId: string, _cursor?: string, _limit?: number) {
    throw new NotImplementedException();
  }
}
