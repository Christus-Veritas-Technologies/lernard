import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class GuardianService {
  async getChildren(_userId: string) {
    throw new NotImplementedException();
  }

  async inviteChild(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async acceptInvite(_userId: string, _code: string) {
    throw new NotImplementedException();
  }

  async getPending(_userId: string) {
    throw new NotImplementedException();
  }

  async cancelInvite(_userId: string, _token: string) {
    throw new NotImplementedException();
  }

  async getChild(_userId: string, _childId: string) {
    throw new NotImplementedException();
  }

  async removeChild(_userId: string, _childId: string) {
    throw new NotImplementedException();
  }

  async getChildProgress(_userId: string, _childId: string) {
    throw new NotImplementedException();
  }

  async getChildSubjects(_userId: string, _childId: string) {
    throw new NotImplementedException();
  }

  async getChildHistory(_userId: string, _childId: string, _cursor?: string, _limit?: number) {
    throw new NotImplementedException();
  }

  async updateChildCompanionControls(_userId: string, _childId: string, _dto: any) {
    throw new NotImplementedException();
  }
}
