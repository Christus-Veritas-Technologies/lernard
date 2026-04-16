import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class SettingsService {
  async get(_userId: string) {
    throw new NotImplementedException();
  }

  async updateMode(_userId: string, _mode: string) {
    throw new NotImplementedException();
  }

  async updateCompanionControls(_userId: string, _dto: any) {
    throw new NotImplementedException();
  }

  async updateAppearance(_userId: string, _appearance: string) {
    throw new NotImplementedException();
  }

  async updateDailyGoal(_userId: string, _target: number) {
    throw new NotImplementedException();
  }
}
