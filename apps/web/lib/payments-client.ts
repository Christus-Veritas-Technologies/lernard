"use client";

import { ROUTES } from "@lernard/routes";
import type {
    Plan,
    PaymentInitResponse,
    PaymentSessionResponse,
    PaymentStatusResponse,
} from "@lernard/shared-types";
import { browserApiFetch } from "./browser-api";

export function initiatePayment(plan: Plan): Promise<PaymentInitResponse> {
    return browserApiFetch<PaymentInitResponse>(ROUTES.PAYMENTS.INITIATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
    });
}

export function getPaymentSession(sessionId: string): Promise<PaymentSessionResponse> {
    return browserApiFetch<PaymentSessionResponse>(ROUTES.PAYMENTS.SESSION(sessionId));
}

export function claimPaymentSession(sessionId: string): Promise<PaymentSessionResponse> {
    return browserApiFetch<PaymentSessionResponse>(ROUTES.PAYMENTS.CLAIM(sessionId), {
        method: "POST",
    });
}

export function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
    return browserApiFetch<PaymentStatusResponse>(ROUTES.PAYMENTS.STATUS(reference));
}
