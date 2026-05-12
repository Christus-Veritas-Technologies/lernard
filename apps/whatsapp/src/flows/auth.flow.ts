import { Injectable, Logger } from '@nestjs/common';
import { SessionsService, StoredSession } from '../sessions/sessions.service';
import { LernardApiService } from '../api/lernard-api.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppState } from '@lernard/whatsapp-core';
import { ROUTES } from '@lernard/routes';
import {
  WELCOME_MESSAGE,
  REQUEST_EMAIL_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  OTP_SENT_MESSAGE,
  OTP_INVALID_MESSAGE,
  OTP_TOO_MANY_ATTEMPTS_MESSAGE,
  SIGNUP_CONFIRM_MESSAGE,
  SIGNUP_DECLINED_MESSAGE,
  ONBOARDING_NAME_MESSAGE,
  ONBOARDING_NAME_SAVED_MESSAGE,
  ONBOARDING_COMPLETE_MESSAGE,
  SIGNIN_COMPLETE_MESSAGE,
  AUTH_ERROR_MESSAGE,
  MENU_MESSAGE,
} from '@lernard/whatsapp-core';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_OTP_ATTEMPTS = 3;

interface MagicLinkResponse {
  message?: string;
  isNewUser?: boolean;
}

interface VerifyOtpResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    name: string;
    onboardingComplete: boolean;
  };
}

@Injectable()
export class AuthFlow {
  private readonly logger = new Logger(AuthFlow.name);

  constructor(
    private readonly sessions: SessionsService,
    private readonly api: LernardApiService,
    private readonly wa: WhatsAppService,
  ) {}

  async handle(session: StoredSession, messageText: string): Promise<void> {
    const phone = session.phoneNumber;
    const state = session.state as WhatsAppState;
    const stateData = (session.stateData ?? {}) as Record<string, unknown>;
    const text = messageText.trim();

    switch (state) {
      case WhatsAppState.UNAUTHENTICATED: {
        const hasGreeted = (stateData['hasGreeted'] as boolean) === true;
        if (!hasGreeted) {
          await this.wa.sendText(phone, WELCOME_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.AWAITING_EMAIL, { hasGreeted: true });
        } else {
          // Already greeted — they sent another message without providing email
          await this.wa.sendText(phone, REQUEST_EMAIL_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.AWAITING_EMAIL, stateData);
        }
        break;
      }

      case WhatsAppState.AWAITING_EMAIL: {
        if (text.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(text)) {
          await this.wa.sendText(phone, INVALID_EMAIL_MESSAGE);
          return;
        }
        const email = text.toLowerCase();
        try {
          await this.api.callPublic<MagicLinkResponse>(ROUTES.AUTH.MAGIC_LINK_REQUEST, {
            method: 'POST',
            body: JSON.stringify({ email, platform: 'whatsapp' }),
          });
          await this.wa.sendText(phone, OTP_SENT_MESSAGE(email));
          await this.sessions.setState(phone, WhatsAppState.AWAITING_OTP, {
            pendingEmail: email,
          });
        } catch (err: unknown) {
          // 404 = user not found → offer signup
          if ((err as Error & { status?: number }).message?.includes('404') ||
              (err as Error).message?.includes('not found')) {
            await this.wa.sendText(phone, SIGNUP_CONFIRM_MESSAGE(email));
            await this.sessions.setState(phone, WhatsAppState.AWAITING_SIGNUP_CONFIRM, {
              pendingEmail: email,
              isNewUser: true,
            });
          } else {
            this.logger.error(`Magic link request failed: ${(err as Error).message}`);
            await this.wa.sendText(phone, AUTH_ERROR_MESSAGE);
          }
        }
        break;
      }

      case WhatsAppState.AWAITING_SIGNUP_CONFIRM: {
        const upper = text.toUpperCase();
        const isYes =
          upper === 'YES' || upper === 'Y' || upper === 'YEAH' || upper === 'YEP' || upper === 'OK' || upper === 'OKAY' || upper === 'SURE';
        const isNo =
          upper === 'NO' || upper === 'N' || upper === 'NOPE' || upper === 'NAH';

        if (isYes) {
          const email = stateData['pendingEmail'] as string;
          try {
            await this.api.callPublic<MagicLinkResponse>(ROUTES.AUTH.MAGIC_LINK_REQUEST, {
              method: 'POST',
              body: JSON.stringify({ email, platform: 'whatsapp', createAccount: true }),
            });
            await this.wa.sendText(phone, OTP_SENT_MESSAGE(email));
            await this.sessions.setState(phone, WhatsAppState.AWAITING_OTP, {
              pendingEmail: email,
            });
          } catch (err) {
            this.logger.error(`Signup magic link failed: ${(err as Error).message}`);
            await this.wa.sendText(phone, AUTH_ERROR_MESSAGE);
          }
        } else if (isNo) {
          await this.wa.sendText(phone, SIGNUP_DECLINED_MESSAGE);
          await this.sessions.setState(phone, WhatsAppState.UNAUTHENTICATED);
        } else {
          // Re-ask
          await this.wa.sendText(
            phone,
            `Please reply *YES* to create your account or *NO* to cancel.`,
          );
        }
        break;
      }

      case WhatsAppState.AWAITING_OTP: {
        const email = stateData['pendingEmail'] as string;
        const attempts = ((stateData['otpAttempts'] as number) ?? 0) + 1;

        try {
          const result = await this.api.callPublic<VerifyOtpResponse>(
            ROUTES.AUTH.MAGIC_LINK_VERIFY,
            {
              method: 'POST',
              body: JSON.stringify({ email, otp: text, platform: 'whatsapp' }),
            },
          );
          if (!result.accessToken || !result.refreshToken) {
            // OTP rejected — count the attempt
            if (attempts >= MAX_OTP_ATTEMPTS) {
              await this.wa.sendText(phone, OTP_TOO_MANY_ATTEMPTS_MESSAGE);
              await this.sessions.setState(phone, WhatsAppState.UNAUTHENTICATED, {});
              return;
            }
            await this.sessions.updateStateData(phone, { otpAttempts: attempts });
            await this.wa.sendText(phone, OTP_INVALID_MESSAGE);
            return;
          }
          await this.sessions.saveTokens(phone, result.accessToken, result.refreshToken);
          if (result.user?.id) {
            await this.sessions.setUserId(phone, result.user.id);
          }
          if (result.user?.onboardingComplete === false) {
            await this.wa.sendText(phone, ONBOARDING_NAME_MESSAGE);
            await this.sessions.setState(phone, WhatsAppState.ONBOARDING_NAME);
          } else {
            const name = result.user?.name ?? 'there';
            await this.wa.sendText(phone, SIGNIN_COMPLETE_MESSAGE(name));
            await this.sessions.setState(phone, WhatsAppState.IDLE);
            await this.wa.sendText(phone, MENU_MESSAGE);
          }
        } catch (err) {
          this.logger.warn(`OTP verification failed: ${(err as Error).message}`);
          if (attempts >= MAX_OTP_ATTEMPTS) {
            await this.wa.sendText(phone, OTP_TOO_MANY_ATTEMPTS_MESSAGE);
            await this.sessions.setState(phone, WhatsAppState.UNAUTHENTICATED, {});
            return;
          }
          await this.sessions.updateStateData(phone, { otpAttempts: attempts });
          await this.wa.sendText(phone, OTP_INVALID_MESSAGE);
        }
        break;
      }

      case WhatsAppState.ONBOARDING_NAME: {
        if (text.length < 1 || text.length > 50) {
          await this.wa.sendText(phone, `Please enter your name (up to 50 characters).`);
          return;
        }
        try {
          await this.api.call(phone, ROUTES.SETTINGS.PROFILE, {
            method: 'PATCH',
            body: JSON.stringify({ name: text }),
          });
          await this.wa.sendText(phone, ONBOARDING_NAME_SAVED_MESSAGE(text));
          // Ask for subjects next
          const subjectsRes = await this.api.callPublic<{ subjects: { id: string; name: string }[] }>(
            ROUTES.SUBJECTS.LIST,
          );
          const subjectList = subjectsRes.subjects
            .map((s) => s.name)
            .slice(0, 15)
            .join(', ');
          await this.wa.sendText(
            phone,
            `What subjects are you studying? Reply with the subjects separated by commas.\n\nAvailable: ${subjectList}`,
          );
          await this.sessions.setState(phone, WhatsAppState.ONBOARDING_SUBJECTS, {
            onboardingName: text,
          });
        } catch (err) {
          this.logger.error(`Profile update failed: ${(err as Error).message}`);
          await this.wa.sendText(phone, AUTH_ERROR_MESSAGE);
        }
        break;
      }

      case WhatsAppState.ONBOARDING_SUBJECTS: {
        const name = (stateData['onboardingName'] as string) ?? 'there';
        const rawSubjects = text.split(',').map((s) => s.trim()).filter(Boolean);
        try {
          const subjectsRes = await this.api.callPublic<{ subjects: { id: string; name: string }[] }>(
            ROUTES.SUBJECTS.LIST,
          );
          const knownSubjects = subjectsRes.subjects;
          for (const raw of rawSubjects) {
            const match = knownSubjects.find(
              (s) => s.name.toLowerCase() === raw.toLowerCase(),
            );
            if (match) {
              try {
                await this.api.call(phone, `/v1/users/me/subjects/${match.id}`, {
                  method: 'POST',
                });
              } catch {
                // ignore individual subject errors
              }
            }
          }
          await this.wa.sendText(phone, ONBOARDING_COMPLETE_MESSAGE(name));
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          await this.wa.sendText(phone, MENU_MESSAGE);
        } catch (err) {
          this.logger.error(`Subject setup failed: ${(err as Error).message}`);
          // Still complete onboarding even if subjects fail
          await this.wa.sendText(phone, ONBOARDING_COMPLETE_MESSAGE(name));
          await this.sessions.setState(phone, WhatsAppState.IDLE);
          await this.wa.sendText(phone, MENU_MESSAGE);
        }
        break;
      }

      default:
        await this.wa.sendText(phone, AUTH_ERROR_MESSAGE);
        await this.sessions.setState(phone, WhatsAppState.UNAUTHENTICATED);
    }
  }
}
