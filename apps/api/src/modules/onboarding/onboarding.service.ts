import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class OnboardingService {
  async setAccountType(_userId: string, _accountType: string) {
    throw new NotImplementedException();
  }

  async setupProfile(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async setSubjects(_userId: string, _subjects: string[]) {
    throw new NotImplementedException();
  }

  async startFirstLook(_userId: string) {
    throw new NotImplementedException();
  }

  async submitFirstLook(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async skipFirstLook(_userId: string) {
    throw new NotImplementedException();
  }
}
