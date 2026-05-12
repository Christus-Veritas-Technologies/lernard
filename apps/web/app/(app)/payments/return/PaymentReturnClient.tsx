"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckmarkCircle01Icon, Loading03Icon, Alert01Icon } from "hugeicons-react";
import { PaymentStatus } from "@lernard/shared-types";
import type { PaymentStatusResponse } from "@lernard/shared-types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { getPaymentStatus } from "@/lib/payments-client";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 90_000;

type ViewState = "loading" | "success" | "failed" | "timeout" | "missing-ref";

function getPlanDisplayName(plan: string): string {
    const names: Record<string, string> = {
        student_scholar: "Student Scholar",
        student_pro: "Student Pro",
        guardian_family_starter: "Family Starter",
        guardian_family_standard: "Family Standard",
        guardian_family_premium: "Family Premium",
    };
    return names[plan] ?? plan;
}

export function PaymentReturnClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const reference = searchParams.get("ref");

    const [viewState, setViewState] = useState<ViewState>(reference ? "loading" : "missing-ref");
    const [planName, setPlanName] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resolvedRef = useRef(false);

    function stopPolling() {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    async function poll() {
        if (!reference || resolvedRef.current) return;

        let result: PaymentStatusResponse;
        try {
            result = await getPaymentStatus(reference);
        } catch {
            return; // Network blip — keep polling
        }

        if (result.status === PaymentStatus.PAID) {
            resolvedRef.current = true;
            stopPolling();
            setPlanName(getPlanDisplayName(result.plan));
            await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
            setViewState("success");
            setTimeout(() => router.push("/home"), 4000);
        } else if (
            result.status === PaymentStatus.FAILED ||
            result.status === PaymentStatus.CANCELLED
        ) {
            resolvedRef.current = true;
            stopPolling();
            setViewState("failed");
        }
    }

    useEffect(() => {
        if (!reference) return;

        // Initial poll immediately
        void poll();

        intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

        timeoutRef.current = setTimeout(() => {
            if (!resolvedRef.current) {
                stopPolling();
                setViewState("timeout");
            }
        }, TIMEOUT_MS);

        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reference]);

    if (viewState === "missing-ref") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Alert01Icon className="text-destructive" size={48} />
                        <h1 className="text-xl font-semibold text-text-primary">Invalid payment link</h1>
                        <p className="text-sm text-text-secondary">
                            This page requires a valid payment reference. Please start a new payment.
                        </p>
                        <Button variant="primary" onClick={() => router.push("/plans")}>
                            View plans
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "loading") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Loading03Icon className="animate-spin text-primary-500" size={48} />
                        <h1 className="text-xl font-semibold text-text-primary">Confirming your payment…</h1>
                        <p className="text-sm text-text-secondary">
                            This usually takes just a few seconds. Please stay on this page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "success") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <CheckmarkCircle01Icon className="text-green-500" size={48} />
                        <h1 className="text-xl font-semibold text-text-primary">
                            {planName ? `You're now on ${planName}` : "Payment confirmed!"}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            Your plan has been activated. Redirecting you to your dashboard…
                        </p>
                        <Button variant="primary" onClick={() => router.push("/home")}>
                            Go to dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "timeout") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Loading03Icon className="text-amber-500" size={48} />
                        <h1 className="text-xl font-semibold text-text-primary">Still checking…</h1>
                        <p className="text-sm text-text-secondary">
                            Your payment is taking longer than expected to confirm. If you completed
                            the payment, your plan will be activated automatically.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => window.location.reload()}>
                                Check again
                            </Button>
                            <Button variant="primary" onClick={() => router.push("/home")}>
                                Go to dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // failed
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    <Alert01Icon className="text-destructive" size={48} />
                    <h1 className="text-xl font-semibold text-text-primary">Payment was not completed</h1>
                    <p className="text-sm text-text-secondary">
                        Your payment was cancelled or failed. No charge was made to your account.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => router.push("/plans")}>
                            Try again
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => window.open("mailto:support@lernard.app", "_blank")}
                        >
                            Contact support
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
