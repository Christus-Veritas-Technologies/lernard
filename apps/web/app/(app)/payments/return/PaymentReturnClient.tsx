"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Alert01Icon, CheckmarkCircle01Icon, Loading03Icon } from "hugeicons-react";
import { PaymentSessionStatus } from "@lernard/shared-types";
import type { PaymentSessionResponse } from "@lernard/shared-types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { BrowserApiError } from "@/lib/browser-api";
import { claimPaymentSession, getPaymentSession } from "@/lib/payments-client";

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

type ViewState = "loading" | "pending" | "success" | "failed" | "missing-session";

function readErrorMessage(error: unknown): string {
    if (error instanceof BrowserApiError) {
        try {
            const body = JSON.parse(error.body) as { message?: string };
            if (body.message) {
                return body.message;
            }
        } catch {
            return "Something went wrong while checking your payment.";
        }
    }

    return "Something went wrong while checking your payment.";
}

export function PaymentReturnClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const intermediatePaymentId = searchParams.get("intermediatePayment");
    const legacySessionId = searchParams.get("sessionId");
    const sessionId = intermediatePaymentId ?? legacySessionId;

    const [viewState, setViewState] = useState<ViewState>(sessionId ? "loading" : "missing-session");
    const [session, setSession] = useState<PaymentSessionResponse | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    async function loadSession() {
        if (!sessionId) {
            setViewState("missing-session");
            return;
        }

        setViewState("loading");
        setMessage(null);

        try {
            const result = await getPaymentSession(sessionId);
            setSession(result);

            if (result.status === PaymentSessionStatus.COMPLETED || result.status === PaymentSessionStatus.CLAIMED) {
                setIsConfirming(true);
                const claimed = await claimPaymentSession(sessionId);
                setSession(claimed);
                await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
                setViewState("success");
                setTimeout(() => router.push("/home"), 2500);
                return;
            }

            if (result.status === PaymentSessionStatus.FAILED) {
                setMessage(
                    result.validationErrors.length > 0
                        ? result.validationErrors[0]
                        : "Your payment could not be completed.",
                );
                setViewState("failed");
                return;
            }

            setViewState("pending");
        } catch (error) {
            setMessage(readErrorMessage(error));
            setViewState("failed");
        } finally {
            setIsConfirming(false);
        }
    }

    useEffect(() => {
        void loadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    if (viewState === "missing-session") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md border-destructive/20 bg-gradient-to-b from-destructive/5 to-background shadow-sm transition-all duration-300">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Alert01Icon className="text-destructive" size={48} />
                        <h1 className="text-xl font-semibold text-text-primary">Invalid payment link</h1>
                        <p className="text-sm text-text-secondary">
                            This page requires an intermediate payment ID. Please start again from the plans page.
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
                <Card className="w-full max-w-md border-primary-200 bg-gradient-to-b from-primary-50/80 to-background shadow-sm transition-all duration-300">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Loading03Icon className="animate-spin text-primary-500" size={48} />
                        <div className="h-1.5 w-24 animate-pulse rounded-full bg-primary-200" />
                        <h1 className="text-xl font-semibold text-text-primary">Checking your payment…</h1>
                        <p className="text-sm text-text-secondary">
                            We’re verifying the payment session and confirming your plan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "pending") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md border-amber-200 bg-gradient-to-b from-amber-50/80 to-background shadow-sm transition-all duration-300">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Loading03Icon className="animate-spin text-amber-500" size={48} />
                        <div className="h-1.5 w-24 animate-pulse rounded-full bg-amber-200" />
                        <h1 className="text-xl font-semibold text-text-primary">Payment is still processing</h1>
                        <p className="text-sm text-text-secondary">
                            We found your session, but Paynow has not confirmed the payment yet.
                        </p>
                        {session && (
                            <p className="text-xs text-text-tertiary">
                                {getPlanDisplayName(session.plan)} · ${session.amountUsd.toFixed(2)}
                            </p>
                        )}
                        <div className="flex flex-wrap justify-center gap-3">
                            <Button variant="secondary" onClick={() => void loadSession()}>
                                Check again
                            </Button>
                            <Button variant="primary" onClick={() => router.push("/plans")}>
                                Back to plans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "success") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <Card className="w-full max-w-md border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-background shadow-md transition-all duration-300">
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <CheckmarkCircle01Icon className="animate-pulse text-emerald-500" size={48} />
                        <div className="h-1.5 w-24 rounded-full bg-emerald-200" />
                        <h1 className="text-xl font-semibold text-text-primary">
                            {session ? `You’re now on ${getPlanDisplayName(session.plan)}` : "Payment confirmed!"}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            Your plan has been activated. Redirecting you to your dashboard…
                        </p>
                        <Button variant="primary" disabled={isConfirming} onClick={() => router.push("/home")}>
                            Go to dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <Card className="w-full max-w-md border-destructive/20 bg-gradient-to-b from-destructive/5 to-background shadow-sm transition-all duration-300">
                <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    <Alert01Icon className="text-destructive" size={48} />
                    <div className="h-1.5 w-24 animate-pulse rounded-full bg-destructive/20" />
                    <h1 className="text-xl font-semibold text-text-primary">Payment could not be confirmed</h1>
                    <p className="text-sm text-text-secondary">{message ?? "Please try the payment again."}</p>
                    {session && (
                        <p className="text-xs text-text-tertiary">
                            {getPlanDisplayName(session.plan)} · ${session.amountUsd.toFixed(2)}
                        </p>
                    )}
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button variant="secondary" onClick={() => router.push("/plans")}>
                            Try again
                        </Button>
                        <Button variant="ghost" onClick={() => window.open("mailto:support@lernard.app", "_blank")}>
                            Contact support
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
