import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class ProgressService {
  async getOverview(_userId: string) {
    throw new NotImplementedException();
  }

  async getSubjects(_userId: string) {
    throw new NotImplementedException();
  }

  async getSubject(_userId: string, _subjectId: string) {
    throw new NotImplementedException();
  }

  async getHistory(_userId: string, _cursor?: string, _limit?: number) {
    throw new NotImplementedException();
  }

  async getGrowthAreas(_userId: string) {
    throw new NotImplementedException();
  }
}
