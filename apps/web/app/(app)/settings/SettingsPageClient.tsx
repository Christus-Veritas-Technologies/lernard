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

import { ToggleCard } from "../../../components/guardian/ToggleCard";
import { PageHero } from "../../../components/dashboard/PageHero";
import { StatCard } from "../../../components/dashboard/StatCard";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { usePagePayload } from "../../../hooks/usePagePayload";
import { browserApiFetch } from "../../../lib/browser-api";

export function SettingsPageClient() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("Changes have not been saved yet.");

    useEffect(() => {
        if (!data?.content) {
            return;
        }

        setSettings(data.content.settings);
        setLockedSettings(data.content.lockedSettings);
        setStatusMessage("Live settings loaded.");
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

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="Guide and Companion keep the lesson tone aligned with the kind of support you want."
                            eyebrow="Mode"
                            label="Current mode"
                            tone="primary"
                            value={capitalize(settings.learningMode)}
                        />
                        <StatCard
                            detail="These preferences shape how Lernard presents and paces your study sessions."
                            eyebrow="Daily goal"
                            label="Target"
                            tone="cool"
                            value={`${settings.dailyGoal} sessions`}
                        />
                    </>
                }
                description="Fine-tune how Lernard teaches, looks, and nudges you through each study session."
                eyebrow="Settings"
                title="Shape how Lernard shows up for you"
            >
                <Badge tone="primary">{capitalize(settings.learningMode)} mode</Badge>
                <Badge tone="cool">{capitalize(settings.appearance)} appearance</Badge>
                <Badge tone="warm">{settings.notificationsEnabled ? "Reminders on" : "Reminders off"}</Badge>
            </PageHero>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Learning mode</CardTitle>
                            <CardDescription>
                                Choose whether Lernard takes the lead or stays beside you with a lighter touch.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
                            {([LearningMode.GUIDE, LearningMode.COMPANION] as const).map((mode) => (
                                <Button
                                    disabled={!canEditMode || savingField === "mode"}
                                    key={mode}
                                    onClick={() => updateMode(mode)}
                                    variant={settings.learningMode === mode ? "primary" : "secondary"}
                                >
                                    {savingField === "mode" && settings.learningMode !== mode
                                        ? "Saving..."
                                        : capitalize(mode)}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>
                                Match Lernard to your preferred light, dark, or system appearance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily goal</CardTitle>
                            <CardDescription>
                                Adjust the number of focused sessions you want to complete each day.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3">
                            <Button
                                disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal <= 1}
                                onClick={() => updateDailyGoal(settings.dailyGoal - 1)}
                                variant="secondary"
                            >
                                -1
                            </Button>
                            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-text-primary">
                                {settings.dailyGoal} sessions
                            </div>
                            <Button
                                disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal >= 10}
                                onClick={() => updateDailyGoal(settings.dailyGoal + 1)}
                            >
                                +1
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Session defaults</CardTitle>
                            <CardDescription>
                                These defaults help Lernard shape each lesson before you even start typing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-text-secondary">
                            <div className="flex items-center justify-between gap-3">
                                <span>Preferred depth</span>
                                <span className="font-medium text-text-primary">{capitalize(settings.preferredDepth)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Preferred session length</span>
                                <span className="font-medium text-text-primary">
                                    {settings.preferredSessionLength ? `${settings.preferredSessionLength} minutes` : "Flexible"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Notifications</span>
                                <span className="font-medium text-text-primary">
                                    {settings.notificationsEnabled ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Update status</CardTitle>
                            <CardDescription>
                                Settings now save to the live backend routes instead of static placeholders.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm leading-6 text-text-secondary">{statusMessage}</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <ToggleCard
                    checked={companionControls.showCorrectAnswers}
                    className={companionControlsLocked ? "opacity-70" : undefined}
                    description="Show the correct answer after a miss when you want feedback to feel direct and reassuring."
                    onCheckedChange={(value) => updateCompanionControl("showCorrectAnswers", value)}
                    title="Show correct answers"
                />
                <ToggleCard
                    checked={companionControls.allowHints}
                    className={companionControlsLocked ? "opacity-70" : undefined}
                    description="Offer a hint before the full answer when you want to support persistence without giving too much away."
                    onCheckedChange={(value) => updateCompanionControl("allowHints", value)}
                    title="Allow hints"
                />
                <ToggleCard
                    checked={companionControls.allowSkip}
                    className={companionControlsLocked ? "opacity-70" : undefined}
                    description="Let yourself skip when momentum matters more than sitting with one stuck point."
                    onCheckedChange={(value) => updateCompanionControl("allowSkip", value)}
                    title="Allow skip"
                />
            </section>
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

function ensureCompanionControls(companionControls: CompanionControls | null) {
    return companionControls ?? {
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