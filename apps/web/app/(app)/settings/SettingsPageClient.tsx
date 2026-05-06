"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import {
    Appearance,
    LearningMode,
    type CompanionControls,
    type SettingsContent,
    type UserSettings,
} from "@lernard/shared-types";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { useAuthMeQuery } from "@/hooks/useAuthMutations";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";

export function SettingsPageClient() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );
    const { data: me } = useAuthMeQuery();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!data?.content) {
            return;
        }

        setSettings(data.content.settings);
        setLockedSettings(data.content.lockedSettings);
        setStatusMessage(null);
    }, [data]);

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>Your settings need your session</CardTitle>
                    <CardDescription>
                        Lernard can only load and save your live settings after you sign in.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading || !settings) {
        return (
            <div className="grid gap-6">
                <Card className="overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
                    <CardContent className="mt-0 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)] lg:items-start">
                        <div className="space-y-4">
                            <div className="h-4 w-28 rounded-full bg-background-subtle" />
                            <div className="h-10 w-2/3 rounded-2xl bg-background-subtle" />
                            <div className="h-24 w-full rounded-3xl bg-background-subtle" />
                        </div>
                        <div className="grid gap-4">
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">
                        Live payload failed
                    </Badge>
                    <CardTitle>Settings could not load right now</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const permissions = data?.permissions ?? [];
    const canEditMode = can(permissions, "can_edit_mode") && !isLocked(lockedSettings, "mode");
    const canEditAppearance = !isLocked(lockedSettings, "appearance");
    const canEditDailyGoal = !isLocked(lockedSettings, "daily-goal");
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, "companion-controls");

    const initials = (me?.name ?? "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="flex flex-col gap-6">
            {/* Page heading */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">Settings</p>
                <h1 className="mt-1.5 text-2xl font-semibold text-text-primary">Account &amp; preferences</h1>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Manage how Lernard teaches, looks, and paces your sessions.
                </p>
                {statusMessage && (
                    <p className="mt-2 text-xs text-text-tertiary">{statusMessage}</p>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
                {/* ── Left column ── */}
                <div className="flex flex-col gap-6">
                    {/* Profile card */}
                    <Card>
                        <CardContent className="flex items-center gap-4 pt-6">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-600">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-text-primary">{me?.name ?? "—"}</p>
                                <p className="truncate text-sm text-text-secondary">{me?.email ?? "—"}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <Badge tone="primary">{capitalize(me?.plan ?? "explorer")}</Badge>
                                    <Badge tone="cool">{capitalize(me?.role ?? "student")}</Badge>
                                </div>
                            </div>
                            <Button asChild size="sm" variant="secondary">
                                <Link href="/settings/profile">Edit</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Learning mode */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Learning mode</CardTitle>
                            <CardDescription>
                                Choose whether Lernard takes the lead (Guide) or stays beside you (Companion).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {([LearningMode.GUIDE, LearningMode.COMPANION] as const).map((mode) => (
                                <Button
                                    disabled={!canEditMode || savingField === "mode"}
                                    key={mode}
                                    onClick={() => updateMode(mode)}
                                    variant={settings.learningMode === mode ? "primary" : "secondary"}
                                >
                                    {capitalize(mode)}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Appearance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>
                                Match Lernard to light, dark, or your system preference.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {([Appearance.LIGHT, Appearance.DARK, Appearance.SYSTEM] as const).map((appearance) => (
                                <Button
                                    disabled={!canEditAppearance || savingField === "appearance"}
                                    key={appearance}
                                    onClick={() => updateAppearance(appearance)}
                                    variant={settings.appearance === appearance ? "primary" : "secondary"}
                                >
                                    {capitalize(appearance)}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Plans link */}
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Plans &amp; billing</p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                                You are on the <span className="font-medium text-primary-500">{capitalize(me?.plan ?? "Explorer")}</span> plan.
                            </p>
                        </div>
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/plans">View plans</Link>
                        </Button>
                    </div>
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-6">
                    {/* Daily goal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily goal</CardTitle>
                            <CardDescription>
                                How many focused sessions do you want to complete each day?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3">
                            <Button
                                disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal <= 1}
                                onClick={() => updateDailyGoal(settings.dailyGoal - 1)}
                                variant="secondary"
                            >
                                −
                            </Button>
                            <div className="min-w-[80px] rounded-2xl border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-text-primary">
                                {settings.dailyGoal}
                            </div>
                            <Button
                                disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal >= 10}
                                onClick={() => updateDailyGoal(settings.dailyGoal + 1)}
                            >
                                +
                            </Button>
                            <span className="text-sm text-text-secondary">sessions / day</span>
                        </CardContent>
                    </Card>

                    {/* Session defaults (read-only) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Session defaults</CardTitle>
                            <CardDescription>
                                These shape how Lernard structures each session. Edit via Profile.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border">
                            <SettingsRow label="Preferred depth" value={capitalize(settings.preferredDepth)} />
                            <SettingsRow
                                label="Session length"
                                value={settings.preferredSessionLength ? `${settings.preferredSessionLength} min` : "Flexible"}
                            />
                            <SettingsRow
                                label="Reminders"
                                value={settings.notificationsEnabled ? "On" : "Off"}
                            />
                        </CardContent>
                    </Card>

                    {/* Study controls */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Study controls</CardTitle>
                            <CardDescription>
                                {companionControlsLocked
                                    ? "These controls are locked by your guardian."
                                    : "Adjust how Lernard supports you during sessions."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border">
                            <ToggleRow
                                checked={companionControls.showCorrectAnswers}
                                disabled={companionControlsLocked || savingField === "companion-controls"}
                                label="Show correct answers"
                                onCheckedChange={(v) => updateCompanionControl("showCorrectAnswers", v)}
                            />
                            <ToggleRow
                                checked={companionControls.allowHints}
                                disabled={companionControlsLocked || savingField === "companion-controls"}
                                label="Allow hints"
                                onCheckedChange={(v) => updateCompanionControl("allowHints", v)}
                            />
                            <ToggleRow
                                checked={companionControls.allowSkip}
                                disabled={companionControlsLocked || savingField === "companion-controls"}
                                label="Allow skip"
                                onCheckedChange={(v) => updateCompanionControl("allowSkip", v)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );

    async function updateMode(mode: LearningMode) {
        setSavingField("mode");
        setStatusMessage("Saving your learning mode...");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.MODE, {
                method: "PATCH",
                body: JSON.stringify({ mode }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Learning mode updated to ${capitalize(mode)}.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateAppearance(appearance: Appearance) {
        setSavingField("appearance");
        setStatusMessage("Saving your appearance preference...");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.APPEARANCE, {
                method: "PATCH",
                body: JSON.stringify({ appearance }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Appearance updated to ${capitalize(appearance)}.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateDailyGoal(dailyTarget: number) {
        setSavingField("daily-goal");
        setStatusMessage("Saving your daily goal...");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.DAILY_GOAL, {
                method: "PATCH",
                body: JSON.stringify({ dailyTarget }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Daily goal updated to ${dailyTarget} sessions.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateCompanionControl(
        key: "showCorrectAnswers" | "allowHints" | "allowSkip",
        value: boolean,
    ) {
        if (companionControlsLocked) {
            setStatusMessage("These companion controls are locked right now.");
            return;
        }

        const nextControls = {
            ...companionControls,
            [key]: value,
        };

        setSettings((current) => current ? {
            ...current,
            companionControls: nextControls,
        } : current);
        setSavingField("companion-controls");
        setStatusMessage("Saving your companion controls...");

        try {
            const savedControls = await browserApiFetch<CompanionControls>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: "PATCH",
                body: JSON.stringify({
                    showCorrectAnswers: nextControls.showCorrectAnswers,
                    allowHints: nextControls.allowHints,
                    allowSkip: nextControls.allowSkip,
                }),
            });

            setSettings((current) => current ? {
                ...current,
                companionControls: savedControls,
            } : current);
            setStatusMessage("Companion controls updated.");
        } catch (saveError) {
            setSettings((current) => current ? {
                ...current,
                companionControls,
            } : current);
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }
}

function ensureCompanionControls(companionControls: CompanionControls | null) {    return companionControls ?? {
        showCorrectAnswers: true,
        allowHints: true,
        allowSkip: false,
        lockedByGuardian: false,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: "You",
    };
}

function isLocked(lockedSettings: string[], key: string) {
    return lockedSettings.includes(key);
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Something interrupted the save.";
}

function SettingsRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="font-medium text-text-primary">{value}</span>
        </div>
    );
}

function ToggleRow({
    checked,
    disabled,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onCheckedChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-text-secondary">{label}</span>
            <Switch
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}