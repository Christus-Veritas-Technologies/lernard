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
import type { PaymentInitResponse, PaymentStatusResponse } from '@lernard/shared-types';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ProtectedRoute()
  @Post('initiate')
  async initiate(
    @CurrentUser() user: User,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentInitResponse> {
    // dto.plan is a shared-types Plan (lowercase e.g. 'student_scholar').
    // Prisma Plan is uppercase. The string uppercased maps 1:1.
    return this.paymentsService.initiatePayment(user.id, dto.plan.toUpperCase() as Plan);
  }

  /**
   * Paynow calls this endpoint with a POST after payment completes.
   * No JWT auth — secured by Paynow hash verification inside the service.
   * Always returns 200 to acknowledge receipt.
   */
  @Post('paynow/callback')
  @HttpCode(HttpStatus.OK)
  async paynowCallback(@Body() body: Record<string, string>): Promise<void> {
    await this.paymentsService.handlePaynowCallback(body);
  }

  @ProtectedRoute()
  @Get('status/:reference')
  async status(
    @CurrentUser() user: User,
    @Param('reference') reference: string,
  ): Promise<PaymentStatusResponse> {
    return this.paymentsService.getPaymentStatus(user.id, reference);
  }
}
