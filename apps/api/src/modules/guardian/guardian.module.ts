import { Module } from '@nestjs/common';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { MailService } from '../auth/mail.service';

@Module({
  controllers: [GuardianController],
  providers: [GuardianService, MailService],
})
export class GuardianModule {}
