import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { SessionsModule } from './sessions/sessions.module';
import { IntentModule } from './intent/intent.module';
import { LernardApiModule } from './api/lernard-api.module';
import { HandlerModule } from './handler/handler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SessionsModule,
    LernardApiModule,
    IntentModule,
    HandlerModule,
    // WhatsApp must be last so all other modules are ready when messages arrive
    WhatsAppModule,
  ],
})
export class AppModule {}
