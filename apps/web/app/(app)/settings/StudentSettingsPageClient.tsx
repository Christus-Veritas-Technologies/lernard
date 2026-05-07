"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import {
    Appearance,
    LearningMode,
    type CompanionControls,
    type ScopedPermission,
    type StudentSettingsContent,
    type UserSettings,
} from "@lernard/shared-types";
import {
    BookOpen01Icon,
    SchoolBell01Icon,
    Settings02Icon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browserApiFetch } from "@/lib/browser-api";
import { formatMinutes, formatSessionsLabel } from "@/lib/formatters";

import {
    DAILY_GOAL_PRESETS,
    ensureCompanionControls,
    formatTokenLabel,
    getErrorMessage,
    getInitials,
    isLocked,
} from "./settings-helpers";

interface StudentSettingsPageClientProps {
    content: StudentSettingsContent;
    permissions: ScopedPermission[];
}

export function StudentSettingsPageClient({ content, permissions }: StudentSettingsPageClientProps) {
    const [settings, setSettings] = useState(content.settings);
    const [lockedSettings, setLockedSettings] = useState(content.lockedSettings);
    const [savingField, setSavingField] = useState<string | null>(null);

    useEffect(() => {
        setSettings(content.settings);
        setLockedSettings(content.lockedSettings);
    }, [content]);

    const canEditMode = can(permissions, "can_edit_mode") && !isLocked(lockedSettings, "mode");
    const canEditAppearance = !isLocked(lockedSettings, "appearance");
    const canEditDailyGoal = !isLocked(lockedSettings, "daily-goal");
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, "companion-controls");

    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#102a66_0%,#304fbf_46%,#0f766e_100%)] text-white shadow-[0_28px_90px_-40px_rgba(30,64,175,0.58)]">
                <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_300px] xl:items-start">
                    <div className="space-y-4">
                        <Badge className="w-fit bg-white/14 text-white" tone="muted">Student settings</Badge>
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white">
                                {getInitials(content.viewer.name)}
                            </div>
                            <div>
                                <p className="text-sm text-white/72">Account preferences for</p>
                                <h1 className="text-2xl font-semibold text-white">{content.viewer.name}</h1>
                            </div>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-white/82">
                            Tune how Lernard teaches, how sessions behave, and how your study space feels without leaving this page.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-white/14 text-white" tone="muted">{formatTokenLabel(content.viewer.plan)}</Badge>
                            <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{formatSessionsLabel(settings.dailyGoal)} daily goal</Badge>
                            <Badge className="bg-amber-100 text-amber-900" tone="muted">{formatTokenLabel(settings.learningMode)} mode</Badge>
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                        <QuickSummaryRow label="Email" value={content.viewer.email ?? "No email on file"} />
                        <QuickSummaryRow label="Session length" value={settings.preferredSessionLength ? formatMinutes(settings.preferredSessionLength) : "Flexible"} />
                        <QuickSummaryRow label="Preferred depth" value={formatTokenLabel(settings.preferredDepth)} />
                    </div>
                </CardContent>
            </Card>

            <Tabs className="flex flex-col gap-4" defaultValue="profile">
                <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="study">Study</TabsTrigger>
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                </TabsList>

                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account snapshot</CardTitle>
                            <CardDescription>
                                Your plan, role, and session defaults are folded into the same live payload as the rest of this page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border">
                            <SettingsRow label="Name" value={content.viewer.name} />
                            <SettingsRow label="Email" value={content.viewer.email ?? "No email on file"} />
                            <SettingsRow label="Plan" value={formatTokenLabel(content.viewer.plan)} />
                            <SettingsRow label="Role" value={formatTokenLabel(content.viewer.role)} />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Session defaults</CardTitle>
                                <CardDescription>
                                    These stay aligned with your onboarding profile so lessons and quizzes keep the same rhythm.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-0 divide-y divide-border">
                                <SettingsRow label="Preferred depth" value={formatTokenLabel(settings.preferredDepth)} />
                                <SettingsRow
                                    label="Session length"
                                    value={settings.preferredSessionLength ? formatMinutes(settings.preferredSessionLength) : "Flexible"}
                                />
                                <SettingsRow
                                    label="Reminders"
                                    value={settings.notificationsEnabled ? "Enabled" : "Muted"}
                                />
                            </CardContent>
                        </Card>

                        <Card className="bg-[linear-gradient(135deg,#fff9f1_0%,#ffffff_58%,#eff6ff_100%)]">
                            <CardHeader>
                                <CardTitle>Need more than quick settings?</CardTitle>
                                <CardDescription>
                                    Plans live separately, but the rest of your account preferences stay here so the settings page remains a one-call surface.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                <Link href="/plans">
                                    <Button variant="secondary">View plans</Button>
                                </Link>
                                <Link href="/learn">
                                    <Button>
                                        Continue learning
                                        <BookOpen01Icon size={16} strokeWidth={1.8} />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" value="study">
                    <div className="flex flex-col gap-6">
                        {!canEditMode && (
                            <Alert variant="warning">
                                <AlertTitle>Learning mode is locked</AlertTitle>
                                <AlertDescription>
                                    A guardian has locked this setting, so Guide and Companion cannot be changed from your account right now.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Learning mode</CardTitle>
                                <CardDescription>
                                    Switch between Guide for structured teaching and Companion for side-by-side support.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                {([LearningMode.GUIDE, LearningMode.COMPANION] as const).map((mode) => (
                                    <Button
                                        className="min-w-32"
                                        disabled={!canEditMode || savingField === "mode"}
                                        key={mode}
                                        onClick={() => updateMode(mode)}
                                        variant={settings.learningMode === mode ? "primary" : "secondary"}
                                    >
                                        {formatTokenLabel(mode)}
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Study controls</CardTitle>
                                <CardDescription>
                                    Decide how much help Lernard gives you mid-session.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-0 divide-y divide-border">
                                <ToggleRow
                                    checked={companionControls.showCorrectAnswers}
                                    description="Reveal the right answer after a miss."
                                    disabled={companionControlsLocked || savingField === "companion-controls"}
                                    label="Show correct answers"
                                    onCheckedChange={(value) => updateCompanionControl("showCorrectAnswers", value)}
                                />
                                <ToggleRow
                                    checked={companionControls.allowHints}
                                    description="Let Lernard give you a nudge before the answer."
                                    disabled={companionControlsLocked || savingField === "companion-controls"}
                                    label="Allow hints"
                                    onCheckedChange={(value) => updateCompanionControl("allowHints", value)}
                                />
                                <ToggleRow
                                    checked={companionControls.allowSkip}
                                    description="Move past a question and return later when needed."
                                    disabled={companionControlsLocked || savingField === "companion-controls"}
                                    label="Allow skip"
                                    onCheckedChange={(value) => updateCompanionControl("allowSkip", value)}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily goal</CardTitle>
                                <CardDescription>
                                    Use quick presets or the stepper to set how many focused sessions you want each day.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Button
                                        disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal <= 1}
                                        onClick={() => updateDailyGoal(settings.dailyGoal - 1)}
                                        variant="secondary"
                                    >
                                        -
                                    </Button>
                                    <div className="min-w-[96px] rounded-3xl border border-border bg-background px-4 py-3 text-center text-lg font-semibold text-text-primary">
                                        {settings.dailyGoal}
                                    </div>
                                    <Button
                                        disabled={!canEditDailyGoal || savingField === "daily-goal" || settings.dailyGoal >= 10}
                                        onClick={() => updateDailyGoal(settings.dailyGoal + 1)}
                                    >
                                        +
                                    </Button>
                                    <span className="text-sm text-text-secondary">sessions / day</span>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary ring-1 ring-inset ring-border transition hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                        disabled={!canEditDailyGoal || savingField === "daily-goal"}
                                    >
                                        Choose a preset
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuLabel>Daily goal presets</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {DAILY_GOAL_PRESETS.map((dailyTarget) => (
                                            <DropdownMenuItem key={dailyTarget} onSelect={() => updateDailyGoal(dailyTarget)}>
                                                {formatSessionsLabel(dailyTarget)}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>

                        <Card className="bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_56%,#f9fff8_100%)]">
                            <CardHeader>
                                <CardTitle>Support level</CardTitle>
                                <CardDescription>
                                    Lernard remembers the balance you prefer, so every lesson starts from the right tone instead of making you reset controls each time.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-text-secondary">
                                <SupportChip icon={SchoolBell01Icon} label={settings.notificationsEnabled ? "Reminders are on" : "Reminders are off"} />
                                <SupportChip icon={Settings02Icon} label={`Last control change by ${companionControls.lastChangedBy}`} />
                                <SupportChip icon={SparklesIcon} label={`Current mode: ${formatTokenLabel(settings.learningMode)}`} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>
                                Match Lernard to your device or pin it to a specific look for longer study sessions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                            {([Appearance.LIGHT, Appearance.DARK, Appearance.SYSTEM] as const).map((appearance) => (
                                <button
                                    className={[
                                        "rounded-[28px] border px-4 py-5 text-left transition",
                                        settings.appearance === appearance
                                            ? "border-primary-500 bg-primary-50 shadow-[0_20px_60px_-40px_rgba(59,130,246,0.6)]"
                                            : "border-border bg-background hover:border-primary-200 hover:bg-background-subtle",
                                    ].join(" ")}
                                    disabled={!canEditAppearance || savingField === "appearance"}
                                    key={appearance}
                                    onClick={() => updateAppearance(appearance)}
                                    type="button"
                                >
                                    <p className="text-sm font-semibold text-text-primary">{formatTokenLabel(appearance)}</p>
                                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                                        {appearance === Appearance.SYSTEM
                                            ? "Follow your device automatically."
                                            : appearance === Appearance.DARK
                                                ? "Reduce glare for late sessions."
                                                : "Keep everything bright and crisp."}
                                    </p>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Current setup</CardTitle>
                            <CardDescription>
                                A quick read on how your study space is configured right now.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border">
                            <SettingsRow label="Theme" value={formatTokenLabel(settings.appearance)} />
                            <SettingsRow label="Daily goal" value={formatSessionsLabel(settings.dailyGoal)} />
                            <SettingsRow label="Learning mode" value={formatTokenLabel(settings.learningMode)} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );

    async function updateMode(mode: LearningMode) {
        setSavingField("mode");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.MODE, {
                method: "PATCH",
                body: JSON.stringify({ mode }),
            });

            setSettings(nextSettings);
            toast.success(`Learning mode updated to ${formatTokenLabel(mode)}.`);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function updateAppearance(appearance: Appearance) {
        setSavingField("appearance");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.APPEARANCE, {
                method: "PATCH",
                body: JSON.stringify({ appearance }),
            });

            setSettings(nextSettings);
            toast.success(`Appearance updated to ${formatTokenLabel(appearance)}.`);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function updateDailyGoal(dailyTarget: number) {
        setSavingField("daily-goal");

        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.DAILY_GOAL, {
                method: "PATCH",
                body: JSON.stringify({ dailyTarget }),
            });

            setSettings(nextSettings);
            toast.success(`Daily goal updated to ${formatSessionsLabel(dailyTarget)}.`);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function updateCompanionControl(
        key: keyof Pick<CompanionControls, "showCorrectAnswers" | "allowHints" | "allowSkip">,
        value: boolean,
    ) {
        if (companionControlsLocked) {
            toast.error("These companion controls are locked right now.");
            return;
        }

        const nextControls = {
            ...companionControls,
            [key]: value,
        };

        setSettings((current) => ({
            ...current,
            companionControls: nextControls,
        }));
        setSavingField("companion-controls");

        try {
            const savedControls = await browserApiFetch<CompanionControls>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: "PATCH",
                body: JSON.stringify({
                    showCorrectAnswers: nextControls.showCorrectAnswers,
                    allowHints: nextControls.allowHints,
                    allowSkip: nextControls.allowSkip,
                }),
            });

            setSettings((current) => ({
                ...current,
                companionControls: savedControls,
            }));
            toast.success("Study controls updated.");
        } catch (error) {
            setSettings((current) => ({
                ...current,
                companionControls,
            }));
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }
}

function QuickSummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
        </div>
    );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="text-right font-medium text-text-primary">{value}</span>
        </div>
    );
}

function SupportChip({
    icon: Icon,
    label,
}: {
    icon: typeof SchoolBell01Icon;
    label: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-background px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon size={18} strokeWidth={1.8} />
            </div>
            <span>{label}</span>
        </div>
    );
}

function ToggleRow({
    checked,
    description,
    disabled,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    description: string;
    disabled: boolean;
    label: string;
    onCheckedChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 py-3">
            <div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </div>
    );
}