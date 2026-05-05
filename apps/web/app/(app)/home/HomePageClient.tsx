"use client";

import {
    BookOpen01Icon,
    CheckmarkCircle01Icon,
    ChartBarLineIcon,
    FireIcon,
    GridViewIcon,
} from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { HomeContent } from "@lernard/shared-types";

import { DashStatCard } from "@/components/dashboard/DashStatCard";
import { PassRateDonut } from "@/components/dashboard/PassRateDonut";
import { SessionsHighlightCard } from "@/components/dashboard/SessionsHighlightCard";
import { SubjectListCard } from "@/components/dashboard/SubjectListCard";
import { SubjectTopicsChart } from "@/components/dashboard/SubjectTopicsChart";
import { WeeklyActivityChart } from "@/components/dashboard/WeeklyActivityChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePagePayload } from "@/hooks/usePagePayload";

export function HomePageClient() {
    const { data, error, isAuthenticated, loading, refetch } =
        usePagePayload<HomeContent>(ROUTES.HOME.PAYLOAD);

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>Your dashboard is ready when you are</CardTitle>
                    <CardDescription>
                        Lernard needs your session before it can load your dashboard.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">
                        Could not load
                    </Badge>
                    <CardTitle>Dashboard unavailable right now</CardTitle>
                    <CardDescription>
                        {error?.message ?? "Something interrupted the API request."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content } = data;

    return (
        <div className="flex flex-col gap-6">
            {/* ── Page header ── */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-500">
                        Your dashboard
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">
                        {content.greeting}
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">
                        {content.streak} day{content.streak === 1 ? "" : "s"} streak
                    </Badge>
                    <Badge tone="primary">Level {content.xpLevel}</Badge>
                    {content.subjects[0] ? (
                        <Badge tone="warm">Focus: {content.subjects[0].name}</Badge>
                    ) : null}
                </div>
            </div>

            {/* ── Stat cards row ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DashStatCard
                    icon={<BookOpen01Icon size={22} strokeWidth={1.8} />}
                    iconBg="bg-primary-100"
                    iconColor="text-primary-500"
                    label="Total sessions"
                    value={content.totalSessions.toLocaleString()}
                />
                <DashStatCard
                    icon={<GridViewIcon size={22} strokeWidth={1.8} />}
                    iconBg="bg-accent-cool-100"
                    iconColor="text-secondary-600"
                    label="Active subjects"
                    value={content.subjects.length}
                />
                <DashStatCard
                    icon={<CheckmarkCircle01Icon size={22} strokeWidth={1.8} />}
                    iconBg="bg-accent-warm-100"
                    iconColor="text-accent-warm-500"
                    label="Pass rate"
                    value={`${content.passRate}%`}
                />
                <DashStatCard
                    icon={<FireIcon size={22} strokeWidth={1.8} />}
                    iconBg="bg-[#FFF8EC]"
                    iconColor="text-warning"
                    label="Study streak"
                    value={`${content.streak}d`}
                />
            </div>

            {/* ── Chart row: Topics chart + Strength donut ── */}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Topics by subject</CardTitle>
                                <CardDescription>
                                    Strong vs developing topics per subject
                                </CardDescription>
                            </div>
                            <Link href="/progress">
                                <Button size="sm" variant="secondary">
                                    <ChartBarLineIcon size={15} strokeWidth={1.8} />
                                    Full progress
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <SubjectTopicsChart data={content.subjectTopics} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Mastery rate</CardTitle>
                        <CardDescription>Topics you&apos;ve mastered vs still learning</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PassRateDonut
                            masteredCount={content.masteredTopicCount}
                            totalCount={content.totalTopicCount}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ── Bottom row: Activity chart | Subject list | Sessions ── */}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly activity</CardTitle>
                        <CardDescription>Your study days this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WeeklyActivityChart
                            activity={content.recentActivity}
                            streak={content.streak}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>By subject</CardTitle>
                        <CardDescription>Strong topics per subject</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SubjectListCard
                            subjectTopics={content.subjectTopics}
                            subjects={content.subjects}
                        />
                    </CardContent>
                </Card>

                <SessionsHighlightCard
                    dailyGoalProgress={content.dailyGoalProgress}
                    dailyGoalTarget={content.dailyGoalTarget}
                    totalSessions={content.totalSessions}
                    xpLevel={content.xpLevel}
                />
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <div className="h-3 w-28 rounded-full bg-background-subtle" />
                <div className="h-8 w-64 rounded-xl bg-background-subtle" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div className="h-22 rounded-2xl bg-background-subtle" key={i} />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-72 rounded-3xl bg-background-subtle lg:col-span-2" />
                <div className="h-72 rounded-3xl bg-background-subtle" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-64 rounded-3xl bg-background-subtle" />
                <div className="h-64 rounded-3xl bg-background-subtle" />
                <div className="h-64 rounded-3xl bg-background-subtle" />
            </div>
        </div>
    );
}