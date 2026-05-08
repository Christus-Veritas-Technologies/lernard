"use client";

import { BookOpen01Icon, ChartBarLineIcon, FireIcon, SchoolBell01Icon } from "hugeicons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { PaginatedHistoryResponse, ProgressContent } from "@lernard/shared-types";

import { DashStatCard } from "@/components/dashboard/DashStatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

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
                    <div className="space-y-3">
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

                            return (
                                <Link href={`/progress/${subject.subjectId}`} key={subject.subjectId}>
                                    <Card className="transition hover:shadow-md">
                                        <CardHeader>
                                            <div className="flex items-center justify-between gap-3">
                                                <CardTitle className="text-base">{subject.subjectName}</CardTitle>
                                                <Badge tone={growthAreaCount > 0 ? "warning" : "success"}>
                                                    {growthAreaCount} growth areas
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                {subject.topics.length} topics tracked
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Progress value={avg} />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {slots.growth_area_nudge ? (
                            <Card className="border-warning bg-warning-bg">
                                <CardContent className="mt-0 text-sm text-warning">
                                    {readSlot(
                                        slots.growth_area_nudge,
                                        "description",
                                        "Spend 10 minutes on a weaker topic today.",
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <CardTitle>Session History</CardTitle>
                                <select
                                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary"
                                    onChange={(event) =>
                                        setHistoryTypeFilter(
                                            event.target.value as "all" | "lesson" | "quiz",
                                        )
                                    }
                                    value={historyTypeFilter}
                                >
                                    <option value="all">All types</option>
                                    <option value="lesson">Lessons</option>
                                    <option value="quiz">Quizzes</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Duration</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(history?.sessions ?? []).map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>{formatDate(session.completedAt)}</TableCell>
                                            <TableCell className="capitalize">{session.type}</TableCell>
                                            <TableCell>{session.subjectName}</TableCell>
                                            <TableCell>{session.topic}</TableCell>
                                            <TableCell>{session.durationMinutes}m</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {history?.hasMore ? (
                                <Button className="mt-4" variant="secondary">
                                    Load more
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
