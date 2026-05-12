import { Injectable, Logger } from '@nestjs/common';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { LernardApiService, PlanLimitError } from '../api/lernard-api.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PlanLimitFlow } from './plan-limit.flow';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { PROJECT_WIZARD_STEPS } from '@lernard/whatsapp-core';
import {
  PROJECT_GENERATING_MESSAGE,
  PROJECT_READY_MESSAGE,
  PROJECT_FAILED_MESSAGE,
  GENERATION_TIMEOUT_MESSAGE,
} from '@lernard/whatsapp-core';

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_RETRIES = 30;

interface ProjectDraftResponse {
  draftId: string;
}

interface ProjectGenerateResponse {
  projectId: string;
  status: string;
}

interface ProjectStatusResponse {
  status: 'generating' | 'ready' | 'failed';
  pdfReadyAt?: string | null;
}

@Injectable()
export class ProjectFlow {
  private readonly logger = new Logger(ProjectFlow.name);

  constructor(
    private readonly sessions: SessionsService,
    private readonly api: LernardApiService,
    private readonly wa: WhatsAppService,
    private readonly planLimitFlow: PlanLimitFlow,
  ) {}

  async handle(
    session: StoredSession,
    messageText: string,
  ): Promise<void> {
    const phone = session.phoneNumber;
    const state = session.state as WhatsAppState;
    const stateData = (session.stateData ?? {}) as Record<string, unknown>;
    const fields = (stateData['fields'] as Record<string, string>) ?? {};

    if (state === WhatsAppState.PROJECT_GENERATING) {
      await this.wa.sendText(phone, `⏳ Your project is still being generated. Please wait...`);
      return;
    }

    // STATE: PROJECT_WIZARD
    const currentStep = (stateData['step'] as number) ?? 0;

    if (state === WhatsAppState.IDLE) {
      // First entry — send step 0
      await this.wa.sendText(phone, PROJECT_WIZARD_STEPS[0].message);
      await this.sessions.setState(phone, WhatsAppState.PROJECT_WIZARD, {
        step: 0,
        fields: {},
      });
      return;
    }

    // Collect answer for current step
    const currentStepDef = PROJECT_WIZARD_STEPS[currentStep];
    if (!currentStepDef) {
      await this.wa.sendText(phone, `Something went wrong. Please try again.`);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
      return;
    }

    // Store the answer
    fields[currentStepDef.key] = messageText.trim();
    const nextStep = currentStep + 1;

    if (nextStep < PROJECT_WIZARD_STEPS.length) {
      // More steps
      await this.wa.sendText(phone, PROJECT_WIZARD_STEPS[nextStep].message);
      await this.sessions.setState(phone, WhatsAppState.PROJECT_WIZARD, {
        step: nextStep,
        fields,
      });
    } else {
      // All steps collected — generate project
      await this.wa.sendText(phone, PROJECT_GENERATING_MESSAGE);
      await this.sessions.setState(phone, WhatsAppState.PROJECT_GENERATING, {
        fields,
      });
      await this.generateProject(phone, fields, session);
    }
  }

  private async generateProject(
    phone: string,
    fields: Record<string, string>,
    session: StoredSession,
  ): Promise<void> {
    try {
      // Create draft
      const draftRes = await this.api.call<ProjectDraftResponse>(
        phone,
        '/v1/projects/draft',
        {
          method: 'POST',
          body: JSON.stringify({
            title: fields['title'] ?? 'My Project',
            subject: fields['subject'],
            level: this.parseLevel(fields['level'] ?? ''),
            topic: fields['topic'],
            targetAudience: fields['targetAudience'],
            wordCount: parseInt(fields['wordCount'] ?? '1000', 10),
            format: fields['format'] ?? 'essay',
            additionalInstructions: fields['additionalInstructions'],
          }),
        },
      );

      const draftId = draftRes.draftId;

      // Generate from draft
      const genRes = await this.api.call<ProjectGenerateResponse>(
        phone,
        `/v1/projects/${draftId}/generate`,
        { method: 'POST' },
      );
      const projectId = genRes.projectId;

      await this.sessions.updateStateData(phone, { projectId });

      // Poll for completion
      for (let attempt = 0; attempt < POLL_MAX_RETRIES; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const status = await this.api.call<ProjectStatusResponse>(
          phone,
          `/v1/projects/${projectId}`,
        );

        if (status.status === 'ready' && status.pdfReadyAt) {
          // Download PDF
          const tokens = await this.sessions.getTokens(phone);
          const pdfRes = await globalThis.fetch(
            `${process.env.LERNARD_API_URL ?? 'http://localhost:3000'}/v1/projects/${projectId}/download`,
            {
              headers: {
                Authorization: `Bearer ${tokens?.accessToken ?? ''}`,
              },
            },
          );
          if (!pdfRes.ok) {
            await this.wa.sendText(phone, PROJECT_FAILED_MESSAGE);
            await this.sessions.setState(phone, WhatsAppState.IDLE);
            return;
          }
          const arrayBuffer = await pdfRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await this.wa.sendDocument(
            phone,
            buffer,
            'lernard-project.pdf',
            PROJECT_READY_MESSAGE,
          );
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }

        if (status.status === 'failed') {
          await this.wa.sendText(phone, PROJECT_FAILED_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          return;
        }
      }

      await this.wa.sendText(phone, GENERATION_TIMEOUT_MESSAGE);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
    } catch (err) {
      if (err instanceof PlanLimitError) {
        await this.planLimitFlow.handle(session, err);
        await this.sessions.setState(phone, WhatsAppState.IDLE);
        return;
      }
      this.logger.error(`Project generation error: ${(err as Error).message}`);
      await this.wa.sendText(phone, PROJECT_FAILED_MESSAGE);
      await this.sessions.setState(phone, WhatsAppState.IDLE);
    }
  }

  private parseLevel(raw: string): string {
    const upper = raw.toUpperCase().replace(/\s/g, '');
    if (upper.startsWith('GRADE')) return upper.toLowerCase();
    if (upper === 'OLEVEL' || upper === 'O-LEVEL') return 'olevel';
    if (upper === 'ALEVEL' || upper === 'A-LEVEL') return 'alevel';
    return raw.toLowerCase();
  }
}
