"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    AlertCircleIcon,
    CheckmarkCircle01Icon,
    Loading03Icon,
    UserAdd01Icon,
    Cancel01Icon,
} from "hugeicons-react";
import { ROUTES } from "@lernard/routes";
import { getAccessToken, getRefreshToken } from "@lernard/auth-core";
import { browserApiFetch, BrowserApiError } from "@/lib/browser-api";

type Step = "loading" | "confirm" | "accepted" | "declined" | "error" | "needs-login";

function AcceptInviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code") ?? searchParams.get("token") ?? "";

    const [step, setStep] = useState<Step>("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [isWorking, setIsWorking] = useState(false);

    useEffect(() => {
        const hasSession = Boolean(getAccessToken() || getRefreshToken());
        if (!hasSession) {
            setStep("needs-login");
            return;
        }
        if (!code) {
            setErrorMessage("This invite link is missing a code.");
            setStep("error");
            return;
        }
        setStep("confirm");
    }, [code]);

    function goToLogin() {
        const next = encodeURIComponent(`/accept-invite?code=${encodeURIComponent(code)}`);
        router.push(`/login?next=${next}`);
    }

    async function handleAccept() {
        setIsWorking(true);
        try {
            await browserApiFetch(ROUTES.GUARDIAN.ACCEPT_INVITE, {
                method: "POST",
                body: JSON.stringify({ code }),
            });
            setStep("accepted");
            setTimeout(() => router.replace("/home"), 1800);
        } catch (err) {
            const msg =
                err instanceof BrowserApiError
                    ? err.body
                    : "Something went wrong. Please try again.";
            setErrorMessage(msg);
            setStep("error");
        } finally {
            setIsWorking(false);
        }
    }

    async function handleDecline() {
        setIsWorking(true);
        try {
            await browserApiFetch(ROUTES.GUARDIAN.DECLINE_INVITE, {
                method: "POST",
                body: JSON.stringify({ code }),
            });
            setStep("declined");
        } catch (err) {
            const msg =
                err instanceof BrowserApiError
                    ? err.body
                    : "Something went wrong. Please try again.";
            setErrorMessage(msg);
            setStep("error");
        } finally {
            setIsWorking(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 text-center">
            {step === "loading" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <Loading03Icon size={48} className="mx-auto animate-spin text-primary-500" strokeWidth={1.5} />
                    <p className="text-base font-medium text-text-secondary">Loading invite…</p>
                </motion.div>
            )}

            {step === "needs-login" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                    <div className="space-y-3">
                        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                            <UserAdd01Icon size={28} strokeWidth={1.5} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                            Guardian invite
                        </h1>
                        <p className="text-sm leading-6 text-text-secondary">
                            Sign in to your Lernard account to accept or decline this guardian invitation.
                        </p>
                    </div>
                    <button
                        onClick={goToLogin}
                        className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                    >
                        Sign in to continue
                    </button>
                </motion.div>
            )}

            {step === "confirm" && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-6"
                >
                    <div className="space-y-3">
                        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                            <UserAdd01Icon size={28} strokeWidth={1.5} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                            Guardian invite
                        </h1>
                        <p className="text-sm leading-6 text-text-secondary">
                            A guardian has invited you to connect your Lernard account. They'll be able to
                            view your progress and manage your learning settings.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleAccept}
                            disabled={isWorking}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60"
                        >
                            {isWorking ? (
                                <Loading03Icon size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <CheckmarkCircle01Icon size={18} strokeWidth={1.5} />
                                    Accept invite
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDecline}
                            disabled={isWorking}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-semibold text-text-primary transition-colors hover:bg-background-subtle disabled:opacity-60"
                        >
                            <Cancel01Icon size={18} strokeWidth={1.5} />
                            Decline
                        </button>
                    </div>
                </motion.div>
            )}

            {step === "accepted" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                >
                    <CheckmarkCircle01Icon size={48} className="mx-auto text-success" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Invite accepted!</h1>
                    <p className="text-sm leading-6 text-text-secondary">
                        Your guardian can now view your progress. Redirecting to home…
                    </p>
                </motion.div>
            )}

            {step === "declined" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                >
                    <Cancel01Icon size={48} className="mx-auto text-text-tertiary" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Invite declined</h1>
                    <p className="text-sm leading-6 text-text-secondary">
                        You've declined the invite. Your account is unchanged.
                    </p>
                    <button
                        onClick={() => router.replace("/home")}
                        className="text-sm font-semibold text-primary-600 hover:underline"
                    >
                        Go to home
                    </button>
                </motion.div>
            )}

            {step === "error" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <AlertCircleIcon size={48} className="mx-auto text-error" strokeWidth={1.5} />
                    <h1 className="text-xl font-bold text-text-primary">Something went wrong</h1>
                    <p className="text-sm leading-6 text-text-secondary">{errorMessage}</p>
                    <button
                        onClick={() => router.replace("/home")}
                        className="text-sm font-semibold text-primary-600 hover:underline"
                    >
                        Go to home
                    </button>
                </motion.div>
            )}
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <Suspense>
                <AcceptInviteContent />
            </Suspense>
        </div>
    );
}
