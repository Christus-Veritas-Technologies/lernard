import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class SubjectsService {
  async getAll() {
    throw new NotImplementedException();
  }

  async getMine(_userId: string) {
    throw new NotImplementedException();
  }

  async addMine(_userId: string, _subjects: string[]) {
    throw new NotImplementedException();
  }

  async removeMine(_userId: string, _subjectId: string) {
    throw new NotImplementedException();
  }

  async reorder(_userId: string, _order: string[]) {
    throw new NotImplementedException();
  }
}
