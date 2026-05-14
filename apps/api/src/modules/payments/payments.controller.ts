import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Plan } from '@prisma/client';
import type {
  PaymentInitResponse,
  PaymentSessionResponse,
  PaymentStatusResponse,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ProtectedRoute()
  @Post('initiate')
  async initiate(
    @CurrentUser() user: User,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentInitResponse> {
    return this.paymentsService.initiatePayment(user.id, dto.plan.toUpperCase() as Plan);
  }

  @ProtectedRoute()
  @Get('sessions/:sessionId')
  async getSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<PaymentSessionResponse> {
    return this.paymentsService.getPaymentSession(user.id, sessionId);
  }

  @ProtectedRoute()
  @Post('sessions/:sessionId/claim')
  @HttpCode(HttpStatus.OK)
  async claimSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<PaymentSessionResponse> {
    return this.paymentsService.claimPaymentSession(user.id, sessionId);
  }

  /**
   * Backward-compatible reference status endpoint.
   */
  @ProtectedRoute()
  @Get('status/:reference')
  async status(
    @CurrentUser() user: User,
    @Param('reference') reference: string,
  ): Promise<PaymentStatusResponse> {
    return this.paymentsService.getPaymentStatus(user.id, reference);
  }

  @Post('paynow/callback')
  @HttpCode(HttpStatus.OK)
  async paynowCallback(@Body() body: Record<string, string>): Promise<void> {
    await this.paymentsService.handlePaynowCallback(body);
  }
}
