import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { HandlerModule } from '../handler/handler.module';

@Module({
  imports: [forwardRef(() => HandlerModule)],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
