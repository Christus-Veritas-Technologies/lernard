import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { R2Module } from '../../r2/r2.module';

@Module({
  imports: [R2Module],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
