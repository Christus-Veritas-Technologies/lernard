"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import { LearningMode, type SettingsContent, type UserSettings } from "@lernard/shared-types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

import { formatTokenLabel, getErrorMessage } from "../settings-helpers";

export default function ModePage() {
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
                    <CardTitle>Mode settings need your session</CardTitle>
                    <CardDescription>Sign in to manage your learning mode.</CardDescription>
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
                    <CardTitle>Mode settings could not load</CardTitle>
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
                    <CardTitle>Mode controls are student-only</CardTitle>
                    <CardDescription>Learning mode is a student setting. Manage linked children from your household settings.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const canEditMode = can(data.permissions, "can_edit_mode") && !data.content.lockedSettings.includes("mode");

    return (
        <div className="flex flex-col gap-6">
            <Card className="border-0 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_100%)] shadow-sm">
                <CardHeader>
                    <Badge className="w-fit" tone="cool">Learning mode</Badge>
                    <CardTitle>Choose how Lernard supports you</CardTitle>
                    <CardDescription>
                        Switch between Guide for structured teaching and Companion for side-by-side support.
                        Changes save instantly.
                    </CardDescription>
                </CardHeader>
            </Card>

            {!canEditMode && (
                <Alert variant="warning">
                    <AlertTitle>Learning mode is locked</AlertTitle>
                    <AlertDescription>
                        A guardian has locked this setting. Contact your guardian to change your learning mode.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Select mode</CardTitle>
                    <CardDescription>Your current mode: <strong>{formatTokenLabel(settings.learningMode)}</strong></CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <ModeCard
                        active={settings.learningMode === LearningMode.GUIDE}
                        description="Lernard leads every session with structured explanations, worked examples, and clear checkpoints."
                        disabled={!canEditMode || saving}
                        label="Guide"
                        onSelect={() => void switchMode(LearningMode.GUIDE)}
                    />
                    <ModeCard
                        active={settings.learningMode === LearningMode.COMPANION}
                        description="Lernard works alongside you — answering questions, offering hints, and stepping back when you are in flow."
                        disabled={!canEditMode || saving}
                        label="Companion"
                        onSelect={() => void switchMode(LearningMode.COMPANION)}
                    />
                </CardContent>
            </Card>
        </div>
    );

    async function switchMode(mode: LearningMode) {
        setSaving(true);
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.MODE, {
                method: "PATCH",
                body: JSON.stringify({ mode }),
            });
            setSettings(nextSettings);
            toast.success(`Learning mode updated to ${formatTokenLabel(mode)}.`);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }
}

function ModeCard({
    label,
    description,
    active,
    disabled,
    onSelect,
}: {
    label: string;
    description: string;
    active: boolean;
    disabled: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            className={[
                "rounded-[28px] border px-5 py-6 text-left transition",
                active
                    ? "border-primary-500 bg-primary-50 shadow-[0_16px_40px_-24px_rgba(59,130,246,0.4)]"
                    : "border-border bg-background hover:border-primary-200 hover:bg-background-subtle",
                disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
            disabled={disabled}
            onClick={onSelect}
            type="button"
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-text-primary">{label}</p>
                {active && (
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                        Active
                    </span>
                )}
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        </button>
    );
}
