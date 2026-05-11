"use client";

import {
    BookOpen01Icon,
    ChartBarLineIcon,
    Clock01Icon,
    FireIcon,
    SchoolBell01Icon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { PaginatedHistoryResponse, ProgressContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashStatCard } from "@/components/dashboard/DashStatCard";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Main component ───────────────────────────────────────────────────────────

export function ProgressPageClient() {
    const { data, error, isAuthenticated, loading, refetch } =
        usePagePayload<ProgressContent>(ROUTES.PROGRESS.OVERVIEW);
    const [history, setHistory] = useState<PaginatedHistoryResponse | null>(null);
    const [historyTypeFilter, setHistoryTypeFilter] = useState<"all" | "lesson" | "quiz">("all");

    useEffect(() => {
        if (!isAuthenticated) return;

        const route =
            historyTypeFilter === "all"
                ? ROUTES.PROGRESS.HISTORY
                : `${ROUTES.PROGRESS.HISTORY}?type=${historyTypeFilter}`;

        void browserApiFetch<PaginatedHistoryResponse>(route)
            .then(setHistory)
            .catch(() => setHistory({ sessions: [], hasMore: false, nextCursor: null }));
    }, [historyTypeFilter, isAuthenticated]);

    const totalLessons = useMemo(
        () => history?.sessions.filter((session) => session.type === "lesson").length ?? 0,
        [history],
    );

    const totalQuizzes = useMemo(
        () => history?.sessions.filter((session) => session.type === "quiz").length ?? 0,
        [history],
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Your progress appears after signing in.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return <div className="h-72 rounded-3xl bg-background-subtle" />;
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load progress</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, slots } = data;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold text-text-primary">Your Progress</h1>
                <p className="mt-1 text-sm text-text-secondary">Track streaks, strengths, and growth areas.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DashStatCard
                    icon={<FireIcon size={20} strokeWidth={1.8} />}
                    label="Streak"
                    value={`${content.streak}d`}
                />
                <DashStatCard
                    icon={<ChartBarLineIcon size={20} strokeWidth={1.8} />}
                    label="XP Level"
                    value={`L${content.xpLevel}`}
                />
                <DashStatCard
                    icon={<BookOpen01Icon size={20} strokeWidth={1.8} />}
                    label="Total Lessons"
                    value={totalLessons}
                />
                <DashStatCard
                    icon={<SchoolBell01Icon size={20} strokeWidth={1.8} />}
                    label="Total Quizzes"
                    value={totalQuizzes}
                />
            </div>

            {slots.lernard_summary_card ? (
                <Card className="bg-primary-50 border-primary-200">
                    <CardHeader>
                        <CardTitle>
                            {readSlot(slots.lernard_summary_card, "title", "Lernard's Read on You")}
                        </CardTitle>
                        <CardDescription>
                            {readSlot(
                                slots.lernard_summary_card,
                                "description",
                                "You are building momentum. Keep focusing on your growth areas.",
                            )}
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            <Tabs defaultValue="subjects">
                <TabsList>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {content.subjects.map((subject) => {
                            const avg =
                                subject.topics.length > 0
                                    ? Math.round(
                                          subject.topics.reduce((sum, topic) => sum + topic.score, 0)
                                              / subject.topics.length,
                                      )
                                    : 0;
                            const growthAreaCount = subject.topics.filter(
                                (topic) => topic.level === "needs_work",
                            ).length;
                            const strengthLevel = subject.strengthLevel === "confident" ? "success" : subject.strengthLevel === "getting_there" ? "warning" : "muted";

                            return (
                                <Link href={`/progress/${subject.subjectId}`} key={subject.subjectId}>
                                    <Card className="h-full transition duration-200 hover:shadow-lg hover:-translate-y-0.5">
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg">{subject.subjectName}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {subject.topics.length} {subject.topics.length === 1 ? "topic" : "topics"}
                                                    </CardDescription>
                                                </div>
                                                <Badge tone={strengthLevel}>
                                                    {avg}%
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-text-tertiary">Mastery</span>
                                                    <span className="font-semibold text-text-primary">{avg}%</span>
                                                </div>
                                                <Progress value={avg} />
                                            </div>
                                            {growthAreaCount > 0 && (
                                                <div className="rounded-2xl border border-warning-200 bg-warning-50 p-3">
                                                    <p className="text-sm font-semibold text-warning">
                                                        {growthAreaCount} {growthAreaCount === 1 ? "area" : "areas"} to strengthen
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {slots.growth_area_nudge ? (
                            <Card className="border-primary-200 bg-primary-50 sm:col-span-2 lg:col-span-3">
                                <CardContent className="mt-6 flex items-start gap-3">
                                    <SparklesIcon size={18} className="mt-0.5 text-primary-600" />
                                    <p className="text-sm leading-6 text-primary-900">
                                        {readSlot(
                                            slots.growth_area_nudge,
                                            "description",
                                            "Spend 10 minutes on a weaker topic today.",
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Session History</CardTitle>
                                    <CardDescription className="mt-1">
                                        Track your learning sessions and progress over time.
                                    </CardDescription>
                                </div>
                                <select
                                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary-200"
                                    onChange={(event) =>
                                        setHistoryTypeFilter(
                                            event.target.value as "all" | "lesson" | "quiz",
                                        )
                                    }
                                    value={historyTypeFilter}
                                >
                                    <option value="all">All types</option>
                                    <option value="lesson">Lessons only</option>
                                    <option value="quiz">Quizzes only</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(history?.sessions ?? []).length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-background-subtle p-8 text-center">
                                    <BookOpen01Icon size={32} className="mx-auto mb-3 text-text-tertiary" />
                                    <p className="text-sm font-semibold text-text-secondary">No sessions yet</p>
                                    <p className="mt-1 text-xs text-text-tertiary">Complete a lesson or quiz to see your history.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(history?.sessions ?? []).map((session) => (
                                        <div
                                            key={session.id}
                                            className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 transition hover:bg-background-subtle"
                                        >
                                            <div className="flex flex-1 items-start gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                                                    {session.type === "lesson" ? (
                                                        <BookOpen01Icon size={20} className="text-primary-600" />
                                                    ) : (
                                                        <SchoolBell01Icon size={20} className="text-primary-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-text-primary">{session.topic}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        <Badge tone={session.type === "lesson" ? "primary" : "cool"}>
                                                            {session.type === "lesson" ? "Lesson" : "Quiz"}
                                                        </Badge>
                                                        <span className="text-xs text-text-tertiary">{session.subjectName}</span>
                                                        <span className="text-xs text-text-tertiary">�</span>
                                                        <span className="flex items-center gap-1 text-xs text-text-tertiary">
                                                            <Clock01Icon size={12} />
                                                            {session.durationMinutes}m
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-xs font-semibold text-text-tertiary">
                                                    {formatDate(session.completedAt)}
                                                </span>
                                                {session.score !== undefined && session.score !== null && (
                                                    <Badge tone={session.score >= 70 ? "success" : session.score >= 50 ? "warning" : "muted"}>
                                                        {session.score}{session.scoreOutOf ? `/${session.scoreOutOf}` : "%"}
                                                    </Badge>
                                                )}
                                                {session.confidenceRating !== undefined && session.confidenceRating !== null && (
                                                    <span className="text-xs font-medium text-text-secondary">
                                                        Confidence: {session.confidenceRating}/5
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {history?.hasMore ? (
                                <Button className="mt-6 w-full" variant="secondary">
                                    Load more sessions
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function readSlot(
    slot: { type: string; data: Record<string, unknown> },
    key: string,
    fallback: string,
): string {
    const value = slot.data[key];
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
}
