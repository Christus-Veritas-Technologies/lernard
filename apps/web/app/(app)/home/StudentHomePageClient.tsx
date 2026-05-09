"use client";

import {
    ArrowRight02Icon,
    BookOpen01Icon,
    ChartBarLineIcon,
    Message01Icon,
    SchoolBell01Icon,
    Settings02Icon,
} from "hugeicons-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { HomeContent, PlanUsage, SlotContent } from "@lernard/shared-types";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagePayload } from "@/hooks/usePagePayload";

export function StudentHomePageClient() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<HomeContent>(ROUTES.HOME.PAYLOAD);
    const [chatPrompt, setChatPrompt] = useState("");
    const [dismissedUrgentAction, setDismissedUrgentAction] = useState(false);
    const initials = useMemo(() => (data ? getInitialsFromGreeting(data.content.greeting) : ""), [data]);

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Lernard needs your session before loading home.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) return <div className="h-72 rounded-3xl bg-background-subtle" />;

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Home unavailable right now</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, slots } = data;
    const subjectRows = content.subjects.map((subject) => {
        const breakdown = content.subjectTopics.find((entry) => entry.subjectId === subject.subjectId);
        const score = breakdown?.readinessPercent ?? null;
        const hasReadiness = typeof score === "number";

        return {
            ...subject,
            score,
            readinessLabel: hasReadiness ? `${score}% ready` : "Not enough activity yet",
            activityCount: breakdown?.activityCount ?? 0,
        };
    });

    return (
        <div className="flex flex-col gap-5">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#1f3a8a_0%,#2d4ec8_45%,#7c3aed_100%)] text-white shadow-[0_24px_80px_-32px_rgba(30,64,175,0.65)]">
                <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px] xl:items-start">
                    <div className="space-y-4">
                        <Badge className="w-fit bg-white/14 text-white" tone="muted">Student Home</Badge>
                        <div className="flex items-center gap-3">
                            <Avatar className="border border-white/20 bg-white/10">
                                <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm text-white/72">Good to see you</p>
                                <h1 className="text-2xl font-semibold text-white">{content.greeting}</h1>
                            </div>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-white/82">
                            Your dashboard is built around momentum first: quick progress reads, subject health, and fast actions into lessons, Practice Exams, and chat.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{content.streak}-day streak</Badge>
                            <Badge className="bg-white/14 text-white" tone="muted">XP level {content.xpLevel}</Badge>
                            <Badge className="bg-amber-100 text-amber-900" tone="muted">Pass rate {content.passRate}%</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link href="/learn">
                                <Button className="bg-white text-sky-900 hover:bg-white/92">
                                    Continue learning
                                    <ArrowRight02Icon size={15} strokeWidth={1.8} />
                                </Button>
                            </Link>
                            <Link href="/chat">
                                <Button className="border-white/20 bg-white/10 text-white hover:bg-white/16" variant="ghost">
                                    <Message01Icon size={16} strokeWidth={1.8} />
                                    Ask Lernard
                                </Button>
                            </Link>
                            <Link href="/settings">
                                <Button className="border-white/20 bg-transparent text-white hover:bg-white/10" variant="ghost">
                                    <Settings02Icon size={16} strokeWidth={1.8} />
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/12 p-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Today</p>
                                <p className="mt-2 text-3xl font-semibold text-white">{content.dailyGoalProgress}/{content.dailyGoalTarget}</p>
                            </div>
                            <div className="rounded-2xl bg-white/14 p-3 text-white">
                                <ChartBarLineIcon size={20} strokeWidth={1.8} />
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 text-text-primary">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Strength map</p>
                                    <p className="mt-2 text-base font-semibold">{content.masteredTopicCount} strong topics</p>
                                </div>
                                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                                    <SchoolBell01Icon size={20} strokeWidth={1.8} />
                                </div>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                                {content.totalTopicCount - content.masteredTopicCount} topics are still open for growth.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard description="Completed lessons and Practice Exams" icon={<BookOpen01Icon size={18} strokeWidth={1.8} />} label="Total sessions" tone="cool" value={`${content.totalSessions}`} />
                <MetricCard description="Accuracy across tracked topics" icon={<SchoolBell01Icon size={18} strokeWidth={1.8} />} label="Pass rate" tone="primary" value={`${content.passRate}%`} />
                <MetricCard description="Strong topics out of all tracked" icon={<ChartBarLineIcon size={18} strokeWidth={1.8} />} label="Mastered topics" tone="success" value={`${content.masteredTopicCount}/${content.totalTopicCount}`} />
                <MetricCard description="Progress toward your daily target" icon={<Message01Icon size={18} strokeWidth={1.8} />} label="Daily goal" tone="warm" value={`${content.dailyGoalProgress}/${content.dailyGoalTarget}`} />
            </section>

            {/* ─── Plan usage row ───────────────────────────────────── */}
            <PlanUsageRow planUsage={content.planUsage} />

            <section className="grid gap-3 rounded-3xl border border-border bg-[linear-gradient(160deg,#eef2ff_0%,#ffffff_100%)] p-4 sm:grid-cols-3">
                <Link href="/learn">
                    <Button className="w-full" variant="secondary">
                        <BookOpen01Icon size={16} strokeWidth={1.8} />
                        Start a new lesson
                    </Button>
                </Link>
                <Link href="/quiz/create">
                    <Button className="w-full" variant="secondary">
                        <SchoolBell01Icon size={16} strokeWidth={1.8} />
                        New practice exam
                    </Button>
                </Link>
                <Link href="/chat">
                    <Button className="w-full" variant="secondary">
                        <Message01Icon size={16} strokeWidth={1.8} />
                        Ask Lernard
                    </Button>
                </Link>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly momentum</CardTitle>
                        <CardDescription>A quick visual pulse of your recent activity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                            <div className="flex items-end gap-3">
                                {content.recentActivity.map((day) => (
                                    <div className="flex flex-1 flex-col items-center gap-2" key={day.day}>
                                        <div className="flex h-28 w-full items-end rounded-xl bg-background-subtle px-1.5 py-1.5">
                                            <div className={`w-full rounded-md ${day.active ? "h-20 bg-primary-500" : "h-7 bg-primary-100"}`} />
                                        </div>
                                        <span className="text-xs text-text-tertiary">{day.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Readiness</TableHead>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Last active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjectRows.map((row) => (
                                        <TableRow key={row.subjectId}>
                                            <TableCell className="font-semibold">{row.name}</TableCell>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <span className="text-xs text-text-secondary">{row.readinessLabel}</span>
                                                    {typeof row.score === "number" ? <Progress value={row.score} /> : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{row.activityCount}</TableCell>
                                            <TableCell>{formatRelativeTime(row.lastActiveAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-5">
                    <Card className="border-0 bg-[linear-gradient(160deg,#eef2ff_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Daily target ring</CardTitle>
                            <CardDescription>Stay on pace with your session goal.</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-0 flex items-center gap-4">
                            <DailyGoalRing completed={content.dailyGoalProgress} target={content.dailyGoalTarget} />
                            <div className="space-y-2">
                                <p className="text-sm text-text-secondary">{content.dailyGoalProgress} of {content.dailyGoalTarget} sessions done.</p>
                                <Badge tone="success">Momentum is building</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-[linear-gradient(160deg,#fff7ed_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Top topics</CardTitle>
                            <CardDescription>Your strongest areas right now.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {content.topTopics.slice(0, 4).length ? (
                                content.topTopics.slice(0, 4).map((topic) => (
                                    <div className="rounded-2xl border border-amber-100 bg-white/80 p-3" key={`${topic.subjectName}-${topic.topic}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{topic.topic}</p>
                                                <p className="text-xs text-text-secondary">{topic.subjectName}</p>
                                            </div>
                                            <Badge tone="cool">{topic.score}%</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-text-secondary">Finish one lesson or Practice Exam to unlock topic-level readiness.</p>
                            )}
                        </CardContent>
                    </Card>

                    {dismissedUrgentAction ? null : (
                        <UrgentActionCard
                            onClose={() => setDismissedUrgentAction(true)}
                            slot={slots.urgent_action ?? null}
                        />
                    )}
                </div>
            </section>

            {slots.streak_nudge ? (
                <Card className="border-0 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] text-white shadow-[0_22px_60px_-34px_rgba(249,115,22,0.7)]">
                    <CardContent className="mt-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-white/16 p-3">
                                <SchoolBell01Icon size={18} strokeWidth={1.8} />
                            </div>
                            <p className="text-sm text-white">{readSlotText(slots.streak_nudge, "description", "Stay consistent today to protect your streak.")}</p>
                        </div>
                        <Button className="bg-white text-amber-700 hover:bg-white/92">Dismiss</Button>
                    </CardContent>
                </Card>
            ) : null}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent sessions</CardTitle>
                        <CardDescription>Last lessons and Practice Exams from your activity stream.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {content.recentSessions.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>When</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {content.recentSessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell><Badge tone={session.type === "quiz" ? "warm" : "cool"}>{session.type === "quiz" ? "Practice Exam" : "Lesson"}</Badge></TableCell>
                                            <TableCell className="font-medium">{session.topic}</TableCell>
                                            <TableCell>{session.subjectName}</TableCell>
                                            <TableCell>{formatRelativeTime(session.completedAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-text-secondary">No sessions yet. Start your first lesson to build momentum.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 bg-[linear-gradient(160deg,#eff6ff_0%,#ffffff_100%)] shadow-sm">
                    <CardHeader>
                        <CardTitle>Ask Lernard anything</CardTitle>
                        <CardDescription>Turn your next question into focused learning fast.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3">
                            <Input onChange={(event) => setChatPrompt(event.target.value)} placeholder="Ask a question about your current topic" value={chatPrompt} />
                            <Link className="w-full" href={chatPrompt.trim() ? `/chat?q=${encodeURIComponent(chatPrompt.trim())}` : "/chat"}>
                                <Button className="w-full">
                                    <Message01Icon size={16} strokeWidth={1.8} />
                                    Open chat
                                </Button>
                            </Link>

                            {slots.primary_cta ? (
                                <Button className="w-full" variant="ghost">
                                    {readSlotText(slots.primary_cta, "title", "Continue learning")}
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function PlanUsageRow({ planUsage }: { planUsage: PlanUsage }) {
    const isExplorer = planUsage.plan === "explorer";

    const lessonPct = planUsage.lessonsLimit > 0
        ? Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)
        : 0;
    const quizPct = planUsage.quizzesLimit > 0
        ? Math.round((planUsage.quizzesUsed / planUsage.quizzesLimit) * 100)
        : 0;

    // Only show bars when consumption is > 50%
    const showLessons = lessonPct > 50;
    const showQuizzes = quizPct > 50 && planUsage.quizzesLimit > 0;

    if (!showLessons && !showQuizzes && !isExplorer) return null;

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary capitalize">
                {planUsage.plan} plan
            </p>
            {showLessons && (
                <div className="flex flex-1 min-w-[140px] items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                        {isExplorer ? "Daily lessons" : "Lessons"}
                    </span>
                    <Progress
                        value={lessonPct}
                        className={`flex-1 ${lessonPct >= 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
                    />
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                        {planUsage.lessonsUsed}/{planUsage.lessonsLimit}
                    </span>
                </div>
            )}
            {showQuizzes && (
                <div className="flex flex-1 min-w-[140px] items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">Practice Exams</span>
                    <Progress
                        value={quizPct}
                        className={`flex-1 ${quizPct >= 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
                    />
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                        {planUsage.quizzesUsed}/{planUsage.quizzesLimit}
                    </span>
                </div>
            )}
            <Link href="/progress?tab=history" className="ml-auto text-xs text-primary underline-offset-2 hover:underline whitespace-nowrap">
                View usage
            </Link>
        </div>
    );
}

function MetricCard({
    label,
    value,
    description,
    icon,
    tone,
}: {
    label: string;
    value: string;
    description: string;
    icon: ReactNode;
    tone: "primary" | "cool" | "success" | "warm";
}) {
    const styles = {
        primary: {
            card: "border-0 bg-[linear-gradient(180deg,#e8eeff_0%,#ffffff_100%)]",
            iconWrap: "bg-primary-500 text-white",
        },
        cool: {
            card: "border-0 bg-[linear-gradient(180deg,#edf7ff_0%,#ffffff_100%)]",
            iconWrap: "bg-accent-cool-100 text-primary-700",
        },
        success: {
            card: "border-0 bg-[linear-gradient(180deg,#ecfdf3_0%,#ffffff_100%)]",
            iconWrap: "bg-success text-white",
        },
        warm: {
            card: "border-0 bg-[linear-gradient(180deg,#fff4e6_0%,#ffffff_100%)]",
            iconWrap: "bg-warning text-white",
        },
    } satisfies Record<typeof tone, { card: string; iconWrap: string }>;

    return (
        <Card className={styles[tone].card}>
            <CardContent className="mt-0 space-y-3">
                <div className="flex items-center justify-between">
                    <Badge className="w-fit" tone={tone}>{label}</Badge>
                    <span className={`rounded-2xl p-3 ${styles[tone].iconWrap}`}>{icon}</span>
                </div>
                <p className="text-2xl font-semibold text-text-primary">{value}</p>
                <p className="text-xs text-text-secondary">{description}</p>
            </CardContent>
        </Card>
    );
}

function DailyGoalRing({ completed, target }: { completed: number; target: number }) {
    const size = 108;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(target > 0 ? completed / target : 0, 0), 1);
    const dash = progress * circumference;

    return (
        <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
                <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#E6EBFA" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    fill="none"
                    r={radius}
                    stroke="#6478B8"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeLinecap="round"
                    strokeWidth={strokeWidth}
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-lg font-semibold text-text-primary">{completed}</p>
                <p className="text-xs text-text-tertiary">of {target}</p>
            </div>
        </div>
    );
}

function UrgentActionCard({
    slot,
    onClose,
}: {
    slot: SlotContent | null;
    onClose: () => void;
}) {
    if (!slot) return null;

    const isFirstLookPrompt = slot.type === "first_lesson_nudge";
    const actionHref = isFirstLookPrompt ? "/first-look" : "/learn";
    const actionLabel = isFirstLookPrompt ? "Open First Look" : "Open";

    return (
        <Alert className="rounded-2xl border-amber-300 bg-amber-50/80" variant="warning">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <AlertTitle>{readSlotText(slot, "title", "Action needed")}</AlertTitle>
                    <AlertDescription>{readSlotText(slot, "description", "You have a quick action waiting.")}</AlertDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge tone="warm">Urgent</Badge>
                    <Button className="h-8 px-3" onClick={onClose} type="button" variant="ghost">Close</Button>
                </div>
            </div>
            <div className="mt-3">
                <Link href={actionHref}>
                    <Button>
                        {actionLabel}
                        <ArrowRight02Icon size={15} strokeWidth={1.8} />
                    </Button>
                </Link>
            </div>
        </Alert>
    );
}

function getInitialsFromGreeting(greeting: string): string {
    const cleaned = greeting
        .replace("Good morning,", "")
        .replace("Good afternoon,", "")
        .replace("Good evening,", "")
        .replace(".", "")
        .trim();

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "L";
    if (parts.length === 1) return (parts[0] ?? "L").slice(0, 1).toUpperCase();
    const first = parts[0] ?? "L";
    const second = parts[1] ?? "L";
    return `${first[0] ?? "L"}${second[0] ?? "L"}`.toUpperCase();
}

function readSlotText(slot: SlotContent, key: string, fallback: string): string {
    const value = slot.data[key];
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatRelativeTime(value: string | null): string {
    if (!value) return "just now";

    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return "just now";

    const diffMs = Date.now() - then;
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
        const mins = Math.max(1, Math.floor(diffMs / minute));
        return `${mins}m ago`;
    }

    if (diffMs < day) {
        const hours = Math.floor(diffMs / hour);
        return `${hours}h ago`;
    }

    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
}
