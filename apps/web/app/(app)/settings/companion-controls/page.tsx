"use client";

import { ROUTES } from "@lernard/routes";
import type { CompanionControls, SettingsContent, UserSettings } from "@lernard/shared-types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

import { ensureCompanionControls, getErrorMessage } from "../settings-helpers";

const THRESHOLD_OPTIONS = [50, 60, 70, 80, 90, 100] as const;

export default function CompanionControlsPage() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data?.content?.roleView === "student") {
            setSettings(data.content.settings);
        }
    }, [data]);

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">Sign in required</Badge>
                    <CardTitle>Companion controls need your session</CardTitle>
                    <CardDescription>Sign in to manage your companion settings.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="grid gap-6">
                <div className="h-48 animate-pulse rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">Failed to load</Badge>
                    <CardTitle>Companion controls could not load</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    if (data.content.roleView !== "student" || !settings) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">Guardian view</Badge>
                    <CardTitle>Companion defaults are student-only</CardTitle>
                    <CardDescription>Manage your children&apos;s companion controls from their individual pages in your household.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const controls = ensureCompanionControls(settings.companionControls);
    const locked = controls.lockedByGuardian || data.content.lockedSettings.includes("companion-controls");

    return (
        <div className="flex flex-col gap-6">
            <Card className="border-0 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_100%)] shadow-sm">
                <CardHeader>
                    <Badge className="w-fit" tone="success">Companion controls</Badge>
                    <CardTitle>How sessions behave in Companion mode</CardTitle>
                    <CardDescription>
                        These defaults apply to your own sessions when you are in Companion mode. Changes save instantly.
                    </CardDescription>
                </CardHeader>
            </Card>

            {locked && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <Badge className="w-fit" tone="warning">Locked by guardian</Badge>
                        <CardTitle>Companion controls are locked</CardTitle>
                        <CardDescription>Your guardian has locked these controls. Contact them to request changes.</CardDescription>
                    </CardHeader>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Answer reveal timing</CardTitle>
                    <CardDescription>When Lernard shows correct answers after a question.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    {(["after_quiz", "immediate"] as const).map((option) => (
                        <button
                            className={[
                                "rounded-[20px] border px-4 py-4 text-left transition",
                                controls.answerRevealTiming === option
                                    ? "border-primary-500 bg-primary-50"
                                    : "border-border bg-background hover:border-primary-200 hover:bg-background-subtle",
                                locked || saving ? "cursor-not-allowed opacity-60" : "",
                            ].join(" ")}
                            disabled={locked || saving}
                            key={option}
                            onClick={() => void updateControls({ ...controls, answerRevealTiming: option })}
                            type="button"
                        >
                            <p className="text-sm font-semibold text-text-primary">
                                {option === "after_quiz" ? "After quiz" : "Immediately"}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                                {option === "after_quiz"
                                    ? "Answers are revealed only once you pass or complete the quiz."
                                    : "Answers are shown right after each question."}
                            </p>
                        </button>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quiz pass threshold</CardTitle>
                    <CardDescription>
                        Minimum score needed to pass a quiz in Companion mode. Currently: <strong>{Math.round(controls.quizPassThreshold * 100)}%</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        {THRESHOLD_OPTIONS.map((pct) => (
                            <button
                                className={[
                                    "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                                    Math.round(controls.quizPassThreshold * 100) === pct
                                        ? "border-primary-500 bg-primary-500 text-white"
                                        : "border-border bg-background text-text-primary hover:border-primary-300 hover:bg-background-subtle",
                                    locked || saving ? "cursor-not-allowed opacity-60" : "",
                                ].join(" ")}
                                disabled={locked || saving}
                                key={pct}
                                onClick={() => void updateControls({ ...controls, quizPassThreshold: pct / 100 })}
                                type="button"
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    async function updateControls(next: CompanionControls) {
        setSaving(true);
        const prev = settings?.companionControls ?? controls;
        setSettings((s) => s ? { ...s, companionControls: next } : s);
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: "PATCH",
                body: JSON.stringify({
                    answerRevealTiming: next.answerRevealTiming,
                    quizPassThreshold: next.quizPassThreshold,
                }),
            });
            setSettings(nextSettings);
            toast.success("Companion controls saved.");
        } catch (err) {
            setSettings((s) => s ? { ...s, companionControls: prev } : s);
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }
}
