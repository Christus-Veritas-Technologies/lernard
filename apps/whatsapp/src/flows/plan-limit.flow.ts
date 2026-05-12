import { Injectable } from '@nestjs/common';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { PLAN_LIMIT_MESSAGE } from '@lernard/whatsapp-core';
import { APP_URL } from '@lernard/whatsapp-core';
import type { PlanLimitError } from '../api/lernard-api.service';

@Injectable()
export class PlanLimitFlow {
  constructor(
    private readonly sessions: SessionsService,
    private readonly wa: WhatsAppService,
  ) {}

  async handle(session: StoredSession, error: PlanLimitError): Promise<void> {
    const phone = session.phoneNumber;
    const appUrl = process.env.APP_URL ?? APP_URL;
    await this.wa.sendText(
      phone,
      PLAN_LIMIT_MESSAGE(error.resource, error.resetAt, appUrl),
    );
    await this.sessions.setState(phone, WhatsAppState.IDLE);
  }
}
