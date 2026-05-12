"use client";

import { ROUTES } from "@lernard/routes";
import type { Plan, PaymentInitResponse, PaymentStatusResponse } from "@lernard/shared-types";
import { browserApiFetch } from "./browser-api";

export function initiatePayment(plan: Plan): Promise<PaymentInitResponse> {
    return browserApiFetch<PaymentInitResponse>(ROUTES.PAYMENTS.INITIATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
    });
}

export function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
    return browserApiFetch<PaymentStatusResponse>(ROUTES.PAYMENTS.STATUS(reference));
}
