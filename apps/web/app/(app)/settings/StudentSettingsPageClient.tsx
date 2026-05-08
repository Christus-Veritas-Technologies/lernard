"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import {
    Appearance,
    LearningMode,
    type PagePayload,
    type PlanUsage,
    type ProgressContent,
    type ScopedPermission,
    type StudentSettingsContent,
    type UserSettings,
} from "@lernard/shared-types";
import {
    BookOpen01Icon,
    Cancel01Icon,
    Delete02Icon,
    LinkSquare01Icon,
    LockIcon,
    Moon02Icon,
    SchoolBell01Icon,
    Settings02Icon,
    SunCloud01Icon,
    SystemUpdateIcon,
    UserCircleIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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

const AGE_GROUPS = ["PRIMARY", "SECONDARY", "UNIVERSITY", "PROFESSIONAL"] as const;
const LEARNING_GOALS = ["EXAM_PREP", "KEEP_UP", "LEARN_NEW", "FILL_GAPS"] as const;
const TEXT_SIZES = ["small", "medium", "large", "xl"] as const;
const SUPPORT_LEVELS = ["minimal", "moderate", "full"] as const;
const SESSION_LENGTHS = [10, 15, 20, 30, 45, 60] as const;
const DEPTH_OPTIONS = ["quick", "standard", "deep"] as const;
const NUDGE_FREQUENCIES = ["daily", "weekly", "in_app_only"] as const;

const DEPTH_LABELS: Record<string, string> = {
    quick: "Quick — short, focused bursts",
    standard: "Standard — balanced depth",
    deep: "Deep — thorough walkthroughs",
};

const SUPPORT_LABELS: Record<string, string> = {
    minimal: "Minimal — let me work it out",
    moderate: "Moderate — hints when needed",
    full: "Full — guide me closely",
};

interface StudentSettingsPageClientProps {
    content: StudentSettingsContent;
    permissions: ScopedPermission[];
}

export function StudentSettingsPageClient({ content, permissions }: StudentSettingsPageClientProps) {
    const [settings, setSettings] = useState(content.settings);
    const [lockedSettings, setLockedSettings] = useState(content.lockedSettings);
    const [viewer, setViewer] = useState(content.viewer);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
    const [nameDraft, setNameDraft] = useState(content.viewer.name);
    const [resetConfirm, setResetConfirm] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [unlinkPassword, setUnlinkPassword] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
    const nameBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSettings(content.settings);
        setLockedSettings(content.lockedSettings);
        setViewer(content.viewer);
        setNameDraft(content.viewer.name);
    }, [content]);

    useEffect(() => {
        browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((data) => setPlanUsage(data.content.planUsage))
            .catch(() => {});
    }, []);

    const canEditMode = can(permissions, "can_edit_mode") && !isLocked(lockedSettings, "mode");
    const canEditAppearance = !isLocked(lockedSettings, "appearance");
    const canEditDailyGoal = !isLocked(lockedSettings, "daily-goal");
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, "companion-controls");
    const isExplorer = viewer.plan === "explorer";
    const isGuardianLinked = Boolean(content.guardianName);

    return (
        <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#102a66_0%,#304fbf_46%,#0f766e_100%)] text-white shadow-[0_28px_90px_-40px_rgba(30,64,175,0.58)]">
                <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_300px] xl:items-start">
                    <div className="space-y-4">
                        <Badge className="w-fit bg-white/14 text-white" tone="muted">Student settings</Badge>
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white">
                                {getInitials(viewer.name)}
                            </div>
                            <div>
                                <p className="text-sm text-white/72">Account preferences for</p>
                                <h1 className="text-2xl font-semibold text-white">{viewer.name}</h1>
                            </div>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-white/82">
                            Tune how Lernard teaches, how sessions behave, and how your study space feels without leaving this page.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-white/14 text-white" tone="muted">{formatTokenLabel(viewer.plan)}</Badge>
                            <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{formatSessionsLabel(settings.dailyGoal)} daily goal</Badge>
                            <Badge className="bg-amber-100 text-amber-900" tone="muted">{formatTokenLabel(settings.learningMode)} mode</Badge>
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                        <QuickSummaryRow label="Email" value={viewer.email ?? "No email on file"} />
                        <QuickSummaryRow label="Session length" value={settings.preferredSessionLength ? formatMinutes(settings.preferredSessionLength) : "Flexible"} />
                        <QuickSummaryRow label="Preferred depth" value={formatTokenLabel(settings.preferredDepth)} />
                    </div>
                </CardContent>
            </Card>

            <Tabs className="flex flex-col gap-4" defaultValue="profile">
                <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="study">Study</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                    <TabsTrigger value="account">Account</TabsTrigger>
                </TabsList>

                {/* ── PROFILE TAB ── */}
                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="profile">
                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your profile</CardTitle>
                                <CardDescription>
                                    Name updates save when you leave the field. Other fields save immediately.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary" htmlFor="profile-name">
                                        Display name
                                    </label>
                                    <Input
                                        id="profile-name"
                                        maxLength={50}
                                        onBlur={saveProfileName}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        value={nameDraft}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">Email</label>
                                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background-subtle px-4 py-3">
                                        <span className="text-sm text-text-secondary">{viewer.email ?? "No email on file"}</span>
                                        <span className="text-xs text-text-secondary">Change email →</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Age group</label>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {AGE_GROUPS.map((ag) => (
                                            <button
                                                className={[
                                                    "rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
                                                    content.viewer.ageGroup === ag
                                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                                        : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                                ].join(" ")}
                                                disabled={savingField === "profile"}
                                                key={ag}
                                                onClick={() => saveProfileField("ageGroup", ag)}
                                                type="button"
                                            >
                                                {formatTokenLabel(ag)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(content.viewer.ageGroup === "SECONDARY" || content.viewer.ageGroup === "UNIVERSITY") && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-text-primary" htmlFor="profile-grade">
                                            Grade / Year
                                        </label>
                                        <Input
                                            id="profile-grade"
                                            maxLength={20}
                                            onBlur={(e) => saveProfileField("grade", e.target.value)}
                                            defaultValue={content.viewer.grade ?? ""}
                                            placeholder="e.g. Year 10, Grade 11"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary" htmlFor="profile-timezone">
                                        Timezone
                                    </label>
                                    <Input
                                        id="profile-timezone"
                                        maxLength={60}
                                        onBlur={(e) => saveProfileField("timezone", e.target.value)}
                                        defaultValue={content.viewer.timezone}
                                        placeholder="e.g. Europe/London"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Learning goal</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {LEARNING_GOALS.map((lg) => (
                                            <button
                                                className={[
                                                    "rounded-2xl border px-3 py-3 text-left text-sm transition",
                                                    content.viewer.learningGoal === lg
                                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                                        : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                                ].join(" ")}
                                                disabled={savingField === "profile"}
                                                key={lg}
                                                onClick={() => saveProfileField("learningGoal", lg)}
                                                type="button"
                                            >
                                                <span className="font-medium">{formatTokenLabel(lg)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Subjects */}
                        {isGuardianLinked && isLocked(lockedSettings, "subjects") ? (
                            <Alert variant="warning">
                                <LockIcon size={16} />
                                <AlertTitle>Subjects locked by {content.guardianName}</AlertTitle>
                                <AlertDescription>
                                    Your guardian {content.guardianName} manages your subject list. Ask them to unlock it if you want to make changes.
                                </AlertDescription>
                            </Alert>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-6">
                        {planUsage && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Plan usage</CardTitle>
                                    <CardDescription>
                                        Your current {planUsage.plan === "explorer" ? "daily" : "monthly"} usage.
                                        Resets {formatDate(planUsage.resetAt)}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-xs text-text-secondary">
                                            <span>Lessons</span>
                                            <span>{planUsage.lessonsUsed} / {planUsage.lessonsLimit}</span>
                                        </div>
                                        <Progress
                                            value={Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)}
                                            className={planUsage.lessonsUsed >= planUsage.lessonsLimit ? "[&>div]:bg-destructive" : undefined}
                                        />
                                    </div>
                                    {planUsage.quizzesLimit > 0 && (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between text-xs text-text-secondary">
                                                <span>Quizzes</span>
                                                <span>{planUsage.quizzesUsed} / {planUsage.quizzesLimit}</span>
                                            </div>
                                            <Progress
                                                value={Math.round((planUsage.quizzesUsed / planUsage.quizzesLimit) * 100)}
                                                className={planUsage.quizzesUsed >= planUsage.quizzesLimit ? "[&>div]:bg-destructive" : undefined}
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        <Link href="/plans">
                                            <Button variant="secondary" size="sm">View plans</Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Linked guardian</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isGuardianLinked ? (
                                    <div className="space-y-2 text-sm">
                                        <p className="font-medium text-text-primary">{content.guardianName}</p>
                                        {content.guardianLinkedSince && (
                                            <p className="text-text-secondary">Linked since {formatDate(content.guardianLinkedSince)}</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-secondary">No guardian linked to this account.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── STUDY TAB ── */}
                <TabsContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" value="study">
                    <div className="flex flex-col gap-6">
                        {!canEditMode && isGuardianLinked && (
                            <Alert variant="warning">
                                <LockIcon size={16} />
                                <AlertTitle>Learning mode locked by {content.guardianName}</AlertTitle>
                                <AlertDescription>
                                    {content.guardianName} has locked this setting. Contact them to make changes.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Learning mode</CardTitle>
                                <CardDescription>
                                    Guide for structured teaching. Companion for side-by-side support.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3 sm:grid-cols-2">
                                {([LearningMode.GUIDE, LearningMode.COMPANION] as const).map((mode) => (
                                    <button
                                        className={[
                                            "rounded-[28px] border px-4 py-5 text-left transition",
                                            settings.learningMode === mode
                                                ? "border-primary-500 bg-primary-50 shadow-[0_20px_60px_-40px_rgba(59,130,246,0.6)]"
                                                : "border-border bg-background hover:border-primary-200 hover:bg-background-subtle",
                                            (!canEditMode || savingField === "mode") && "pointer-events-none opacity-60",
                                        ].join(" ")}
                                        disabled={!canEditMode || savingField === "mode"}
                                        key={mode}
                                        onClick={() => updateMode(mode)}
                                        type="button"
                                    >
                                        <p className="text-sm font-semibold text-text-primary">{formatTokenLabel(mode)}</p>
                                        <p className="mt-1 text-sm leading-6 text-text-secondary">
                                            {mode === LearningMode.GUIDE
                                                ? "Structured lessons with clear explanations."
                                                : "Ask questions and get support as you work."}
                                        </p>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {settings.learningMode === LearningMode.COMPANION && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle>Companion controls</CardTitle>
                                            <CardDescription>
                                                Fine-tune how Companion handles quizzes and hints.
                                            </CardDescription>
                                        </div>
                                        {companionControlsLocked && (
                                            <Badge tone="warning">
                                                <LockIcon size={12} className="mr-1" />
                                                Locked
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-0 divide-y divide-border">
                                    <SettingsRow label="Answer reveal" value={companionControls.answerRevealTiming === "after_quiz" ? "After quiz passed" : "Immediately"} />
                                    <SettingsRow label="Pass threshold" value={`${Math.round(companionControls.quizPassThreshold * 100)}%`} />
                                    {companionControlsLocked && (
                                        <p className="pt-3 text-xs text-text-secondary">
                                            Managed by {content.guardianName ?? "a guardian"}. Contact them to adjust.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Session depth</CardTitle>
                                <CardDescription>How thorough Lernard should be during each session.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-2">
                                {DEPTH_OPTIONS.map((depth) => (
                                    <button
                                        className={[
                                            "rounded-2xl border px-4 py-3 text-left text-sm transition",
                                            settings.preferredDepth === depth
                                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                                : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                        ].join(" ")}
                                        disabled={savingField === "study"}
                                        key={depth}
                                        onClick={() => saveStudyField("preferredDepth", depth)}
                                        type="button"
                                    >
                                        {DEPTH_LABELS[depth]}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Support level</CardTitle>
                                <CardDescription>How much help Lernard offers by default.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-2">
                                {SUPPORT_LEVELS.map((lvl) => (
                                    <button
                                        className={[
                                            "rounded-2xl border px-4 py-3 text-left text-sm transition",
                                            (settings as any).supportLevel === lvl
                                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                                : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                        ].join(" ")}
                                        disabled={savingField === "study"}
                                        key={lvl}
                                        onClick={() => saveStudyField("supportLevel", lvl)}
                                        type="button"
                                    >
                                        {SUPPORT_LABELS[lvl]}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Session length</CardTitle>
                                <CardDescription>Preferred length for each focused session.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-2">
                                {SESSION_LENGTHS.map((len) => (
                                    <button
                                        className={[
                                            "rounded-2xl border px-3 py-3 text-center text-sm font-medium transition",
                                            settings.preferredSessionLength === len
                                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                                : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                        ].join(" ")}
                                        disabled={savingField === "study"}
                                        key={len}
                                        onClick={() => saveStudyField("sessionLength", len)}
                                        type="button"
                                    >
                                        {formatMinutes(len)}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Daily goal</CardTitle>
                                <CardDescription>Sessions you aim to complete each day.</CardDescription>
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
                                    <span className="text-sm text-text-secondary">/ day</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary ring-1 ring-inset ring-border transition hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                        disabled={!canEditDailyGoal || savingField === "daily-goal"}
                                    >
                                        Quick presets
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
                    </div>
                </TabsContent>

                {/* ── NOTIFICATIONS TAB ── */}
                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reminders & alerts</CardTitle>
                            <CardDescription>
                                Control when and how Lernard nudges you to study.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border">
                            <ToggleRow
                                checked={(settings as any).reminderEnabled ?? true}
                                description="Daily reminder to keep your streak going."
                                disabled={savingField === "notifications"}
                                label="Study reminder"
                                onCheckedChange={(v) => saveNotificationField("reminderEnabled", v)}
                            />
                            <ToggleRow
                                checked={(settings as any).streakAlertEnabled ?? true}
                                description="Alert when your streak is at risk."
                                disabled={savingField === "notifications"}
                                label="Streak alert"
                                onCheckedChange={(v) => saveNotificationField("streakAlertEnabled", v)}
                            />
                            <ToggleRow
                                checked={(settings as any).growthAreaNudgeEnabled ?? true}
                                description="Get nudged to revisit your growth areas."
                                disabled={savingField === "notifications"}
                                label="Growth area nudges"
                                onCheckedChange={(v) => saveNotificationField("growthAreaNudgeEnabled", v)}
                            />
                            {(settings as any).growthAreaNudgeEnabled && (
                                <div className="py-3">
                                    <label className="text-sm font-medium text-text-primary">Nudge frequency</label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {NUDGE_FREQUENCIES.map((freq) => (
                                            <button
                                                className={[
                                                    "rounded-2xl border px-3 py-2 text-sm transition",
                                                    (settings as any).growthAreaNudgeFrequency === freq
                                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                                        : "border-border bg-background text-text-secondary hover:border-primary-200",
                                                ].join(" ")}
                                                disabled={savingField === "notifications"}
                                                key={freq}
                                                onClick={() => saveNotificationField("growthAreaNudgeFrequency", freq)}
                                                type="button"
                                            >
                                                {formatTokenLabel(freq)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <ToggleRow
                                checked={(settings as any).weeklyEmailEnabled ?? true}
                                description="A weekly summary of your progress."
                                disabled={savingField === "notifications"}
                                label="Weekly email"
                                onCheckedChange={(v) => saveNotificationField("weeklyEmailEnabled", v)}
                            />
                            <ToggleRow
                                checked={(settings as any).planLimitAlertEnabled ?? true}
                                description={isExplorer ? "Required for Explorer plan — cannot be disabled." : "Alert when you are close to your plan limits."}
                                disabled={savingField === "notifications" || isExplorer}
                                label="Plan limit alert"
                                onCheckedChange={(v) => saveNotificationField("planLimitAlertEnabled", v)}
                            />
                        </CardContent>
                    </Card>

                    {(settings as any).reminderEnabled && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Reminder time</CardTitle>
                                <CardDescription>What time should Lernard remind you to study?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    type="time"
                                    defaultValue={(settings as any).reminderTime ?? "07:00"}
                                    onBlur={(e) => saveNotificationField("reminderTime", e.target.value)}
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ── APPEARANCE TAB ── */}
                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme</CardTitle>
                            <CardDescription>
                                Match Lernard to your device or pin it to a specific look.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                            {([Appearance.LIGHT, Appearance.DARK, Appearance.SYSTEM] as const).map((appearance) => {
                                const Icon = appearance === Appearance.LIGHT ? SunCloud01Icon : appearance === Appearance.DARK ? Moon02Icon : SystemUpdateIcon;
                                return (
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
                                        <Icon size={20} className="mb-2 text-text-secondary" strokeWidth={1.8} />
                                        <p className="text-sm font-semibold text-text-primary">{formatTokenLabel(appearance)}</p>
                                        <p className="mt-1 text-xs leading-5 text-text-secondary">
                                            {appearance === Appearance.SYSTEM
                                                ? "Follow your device automatically."
                                                : appearance === Appearance.DARK
                                                    ? "Reduce glare for late sessions."
                                                    : "Keep everything bright and crisp."}
                                        </p>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Text size</CardTitle>
                                <CardDescription>Preview: <span className={`text-size-preview-${(settings as any).textSize ?? "medium"}`}>The quick brown fox.</span></CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {TEXT_SIZES.map((sz) => (
                                    <button
                                        className={[
                                            "rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
                                            (settings as any).textSize === sz
                                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                                : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                        ].join(" ")}
                                        disabled={savingField === "appearance-ext"}
                                        key={sz}
                                        onClick={() => saveAppearanceExt("textSize", sz)}
                                        type="button"
                                    >
                                        {formatTokenLabel(sz)}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Reduced motion</CardTitle>
                                <CardDescription>Minimize animations for a calmer experience.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ToggleRow
                                    checked={(settings as any).reducedMotion ?? false}
                                    description="Turn off slide and fade transitions."
                                    disabled={savingField === "appearance-ext"}
                                    label="Reduce motion"
                                    onCheckedChange={(v) => saveAppearanceExt("reducedMotion", v)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── ACCOUNT TAB ── */}
                <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="account">
                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your plan</CardTitle>
                                <CardDescription>
                                    {viewer.plan === "explorer"
                                        ? "Explorer — free plan with daily limits."
                                        : viewer.plan === "scholar"
                                            ? "Scholar — unlimited personal study."
                                            : "Household — family plan."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    {viewer.plan === "explorer" && (
                                        <Link href="/plans">
                                            <Button>Upgrade to Scholar</Button>
                                        </Link>
                                    )}
                                    <Link href="/plans">
                                        <Button variant="secondary">View all plans</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        {isGuardianLinked && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Linked guardian</CardTitle>
                                    <CardDescription>
                                        {content.guardianName} is linked to this account
                                        {content.guardianLinkedSince ? ` since ${formatDate(content.guardianLinkedSince)}` : ""}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="secondary" onClick={() => setShowUnlinkDialog(true)}>
                                        <LinkSquare01Icon size={16} strokeWidth={1.8} />
                                        Unlink guardian
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Collapsible>
                            <Card>
                                <CardHeader>
                                    <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                                        <div>
                                            <CardTitle>Data &amp; privacy</CardTitle>
                                            <CardDescription>Manage your data and privacy options.</CardDescription>
                                        </div>
                                        <span className="text-sm text-text-secondary">▾</span>
                                    </CollapsibleTrigger>
                                </CardHeader>
                                <CollapsibleContent>
                                    <CardContent className="space-y-4 pt-0">
                                        <p className="text-sm text-text-secondary">
                                            Lernard stores your progress, quiz results, and session history. You can reset your progress or delete your account at any time.
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <Link href="/privacy" target="_blank">
                                                <Button variant="secondary" size="sm">Privacy policy</Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>
                    </div>

                    <div className="flex flex-col gap-6">
                        <Card className="border-amber-200 bg-amber-50">
                            <CardHeader>
                                <CardTitle>Reset progress</CardTitle>
                                <CardDescription>
                                    Clears all lessons, quizzes, and streaks. This cannot be undone.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-text-secondary">
                                    Type <span className="font-mono font-semibold">RESET</span> to confirm.
                                </p>
                                <Input
                                    maxLength={5}
                                    onChange={(e) => setResetConfirm(e.target.value)}
                                    placeholder="Type RESET"
                                    value={resetConfirm}
                                />
                                <Button
                                    disabled={resetConfirm !== "RESET" || savingField === "reset"}
                                    onClick={handleResetProgress}
                                    variant="secondary"
                                >
                                    Reset all progress
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="text-red-700">Delete account</CardTitle>
                                <CardDescription>
                                    Permanently deletes your account and all data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => setShowDeleteDialog(true)}
                                    variant="secondary"
                                    className="border-red-300 text-red-700 hover:bg-red-100"
                                >
                                    <Delete02Icon size={16} strokeWidth={1.8} />
                                    Delete my account
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <Button
                                    className="w-full"
                                    onClick={handleSignOut}
                                    variant="secondary"
                                >
                                    Sign out
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Unlink guardian dialog */}
            <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unlink guardian</DialogTitle>
                        <DialogDescription>
                            This removes {content.guardianName} from your account. Confirm your password to continue.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary" htmlFor="unlink-password">
                            Your password
                        </label>
                        <Input
                            id="unlink-password"
                            onChange={(e) => setUnlinkPassword(e.target.value)}
                            placeholder="Enter your password"
                            type="password"
                            value={unlinkPassword}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => { setShowUnlinkDialog(false); setUnlinkPassword(""); }} variant="secondary">Cancel</Button>
                        <Button
                            disabled={!unlinkPassword || savingField === "unlink"}
                            onClick={handleUnlinkGuardian}
                        >
                            Unlink guardian
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete account dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-700">Delete account</DialogTitle>
                        <DialogDescription>
                            This permanently deletes your account and all data. Type <span className="font-mono font-semibold">DELETE</span> and enter your password to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            maxLength={6}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder="Type DELETE"
                            value={deleteConfirm}
                        />
                        <Input
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Your password"
                            type="password"
                            value={deletePassword}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); setDeletePassword(""); }} variant="secondary">Cancel</Button>
                        <Button
                            className="border-red-300 bg-red-600 text-white hover:bg-red-700"
                            disabled={deleteConfirm !== "DELETE" || !deletePassword || savingField === "delete"}
                            onClick={handleDeleteAccount}
                        >
                            Delete my account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    // ── handlers ──

    function saveProfileName() {
        if (nameBlurRef.current) clearTimeout(nameBlurRef.current);
        nameBlurRef.current = setTimeout(async () => {
            if (nameDraft === viewer.name) return;
            setSavingField("profile-name");
            try {
                await browserApiFetch(ROUTES.SETTINGS.PROFILE, {
                    method: "PATCH",
                    body: JSON.stringify({ name: nameDraft.trim() }),
                });
                setViewer((v) => ({ ...v, name: nameDraft.trim() }));
                toast.success("Name updated.");
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setSavingField(null);
            }
        }, 400);
    }

    async function saveProfileField(field: string, value: unknown) {
        setSavingField("profile");
        try {
            await browserApiFetch(ROUTES.SETTINGS.PROFILE, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            toast.success("Profile updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveStudyField(field: string, value: unknown) {
        setSavingField("study");
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.STUDY, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            setSettings(nextSettings);
            toast.success("Study settings updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveNotificationField(field: string, value: unknown) {
        setSavingField("notifications");
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.NOTIFICATIONS, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            setSettings(nextSettings);
            toast.success("Notification settings updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveAppearanceExt(field: string, value: unknown) {
        setSavingField("appearance-ext");
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.STUDY, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            setSettings(nextSettings);
            toast.success("Appearance updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

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

    async function handleResetProgress() {
        setSavingField("reset");
        try {
            await browserApiFetch(ROUTES.PROGRESS.RESET, { method: "DELETE" });
            setResetConfirm("");
            toast.success("Progress reset. Starting fresh.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function handleUnlinkGuardian() {
        setSavingField("unlink");
        try {
            await browserApiFetch(ROUTES.SETTINGS.UNLINK_GUARDIAN, {
                method: "POST",
                body: JSON.stringify({ studentPassword: unlinkPassword }),
            });
            setShowUnlinkDialog(false);
            setUnlinkPassword("");
            toast.success("Guardian unlinked successfully.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function handleDeleteAccount() {
        setSavingField("delete");
        try {
            await browserApiFetch(ROUTES.SETTINGS.DELETE_ACCOUNT, {
                method: "DELETE",
                body: JSON.stringify({ password: deletePassword }),
            });
            window.location.href = "/";
        } catch (error) {
            toast.error(getErrorMessage(error));
            setSavingField(null);
        }
    }

    async function handleSignOut() {
        try {
            await browserApiFetch(ROUTES.AUTH.LOGOUT, { method: "POST" });
        } catch {
            // ignore
        }
        window.location.href = "/";
    }
}

// ── sub-components ──

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

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString();
}

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
import { Progress } from "@/components/ui/progress";
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
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

    useEffect(() => {
        setSettings(content.settings);
        setLockedSettings(content.lockedSettings);
    }, [content]);

    useEffect(() => {
        browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((data) => setPlanUsage(data.content.planUsage))
            .catch(() => {});
    }, []);

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

                    {planUsage && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Plan usage</CardTitle>
                                <CardDescription>
                                    Your current {planUsage.plan === "explorer" ? "daily" : "monthly"} usage.
                                    Resets {formatDate(planUsage.resetAt)}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs text-text-secondary">
                                        <span>Lessons</span>
                                        <span>{planUsage.lessonsUsed} / {planUsage.lessonsLimit}</span>
                                    </div>
                                    <Progress
                                        value={Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)}
                                        className={planUsage.lessonsUsed >= planUsage.lessonsLimit ? "[&>div]:bg-destructive" : undefined}
                                    />
                                </div>
                                {planUsage.quizzesLimit > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-xs text-text-secondary">
                                            <span>Quizzes</span>
                                            <span>{planUsage.quizzesUsed} / {planUsage.quizzesLimit}</span>
                                        </div>
                                        <Progress
                                            value={Math.round((planUsage.quizzesUsed / planUsage.quizzesLimit) * 100)}
                                            className={planUsage.quizzesUsed >= planUsage.quizzesLimit ? "[&>div]:bg-destructive" : undefined}
                                        />
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    <Link href="/plans">
                                        <Button variant="secondary" size="sm">View plans</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

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
                            <CardContent className="space-y-3">
                                {companionControlsLocked && (
                                    <p className="text-xs text-text-secondary">
                                        These settings are managed by your guardian.
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Answer reveal</span>
                                    <span className="font-medium text-text-primary">
                                        {companionControls.answerRevealTiming === "after_quiz" ? "After quiz passed" : "Immediately"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Pass threshold</span>
                                    <span className="font-medium text-text-primary">
                                        {Math.round(companionControls.quizPassThreshold * 100)}%
                                    </span>
                                </div>
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

    // companion controls are now managed by guardians on the dedicated companion page
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

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString();
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