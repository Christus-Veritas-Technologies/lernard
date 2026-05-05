"use client";

import { ROUTES } from "@lernard/routes";
import type { HomeContent } from "@lernard/shared-types";

import { PageHero } from "@/components/dashboard/PageHero";
import { PerformanceList } from "@/components/dashboard/PerformanceList";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePagePayload } from "@/hooks/usePagePayload";
import { formatRelativeDate } from "@/lib/formatters";

function getStrengthTone(strengthLevel: string) {
    if (strengthLevel === "strong") return "success" as const;
    if (strengthLevel === "developing") return "warning" as const;
    return "warm" as const;
}

export function HomePageClient() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<HomeContent>(
        ROUTES.HOME.PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">Sign in required</Badge>
                    <CardTitle>Your dashboard is ready when you are</CardTitle>
                    <CardDescription>
                        Lernard needs your session token before it can load your real Home payload.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="grid gap-6">
                <Card>
                    <CardContent className="mt-0 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)] lg:items-start">
                        <div className="space-y-4">
                            <div className="h-4 w-28 rounded-full bg-background-subtle" />
                            <div className="h-10 w-3/4 rounded-2xl bg-background-subtle" />
                            <div className="h-20 w-full rounded-3xl bg-background-subtle" />
                        </div>
                        <div className="grid gap-4">
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="h-52 rounded-3xl bg-background-subtle" />
                    <div className="h-52 rounded-3xl bg-background-subtle" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">Live payload failed</Badge>
                    <CardTitle>Home could not load right now</CardTitle>
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
    const dailyGoalPercent = Math.round(
        (content.dailyGoalProgress / Math.max(content.dailyGoalTarget, 1)) * 100,
    );
    const momentum = buildMomentum(content, dailyGoalPercent);

    if (!content.subjects.length) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="primary">Fresh start</Badge>
                    <CardTitle>{content.greeting}</CardTitle>
                    <CardDescription>
                        Add subjects during onboarding and your dashboard will populate with live progress data.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="Sessions completed today vs your daily goal."
                            eyebrow="Today"
                            label="Daily goal"
                            progress={dailyGoalPercent}
                            tone="primary"
                            value={`${content.dailyGoalProgress}/${content.dailyGoalTarget}`}
                        />
                        <StatCard
                            detail="Based on total sessions completed."
                            eyebrow="Current level"
                            label="XP level"
                            tone="cool"
                            value={`Level ${content.xpLevel}`}
                        />
                    </>
                }
                description="Track your subject strength, daily goal, and streak from one place."
                eyebrow="Your dashboard"
                title={content.greeting}
            >
                <Badge tone="success">{content.streak}-day streak</Badge>
                <Badge tone="primary">Level {content.xpLevel}</Badge>
                {content.subjects[0] ? (
                    <Badge tone="warm">Focus: {content.subjects[0].name}</Badge>
                ) : null}
            </PageHero>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle>Subject focus</CardTitle>
                                <CardDescription>
                                    Strength level and priority for each subject you are tracking.
                                </CardDescription>
                            </div>
                            <Button variant="secondary">Manage subjects</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {content.subjects.map((subject) => (
                            <div
                                className="rounded-2xl border border-border bg-background/70 p-4"
                                key={subject.subjectId}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-base font-semibold text-text-primary">
                                        {subject.name}
                                    </p>
                                    <Badge tone={getStrengthTone(subject.strengthLevel)}>
                                        {subject.strengthLevel.replace("_", " ")}
                                    </Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-text-secondary">
                                    Last active {formatRelativeDate(subject.lastActiveAt)}
                                </p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-text-secondary">
                                        <span>Priority in queue</span>
                                        <span>#{subject.priorityIndex + 1}</span>
                                    </div>
                                    <Progress value={Math.max(20, 100 - subject.priorityIndex * 20)} />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Study momentum</CardTitle>
                        <CardDescription>
                            A quick read on your daily goal, streak, and subject mix.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PerformanceList items={momentum} />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function buildMomentum(content: HomeContent, dailyGoalPercent: number) {
    return [
        {
            label: "Daily goal",
            value: Math.min(100, dailyGoalPercent),
            trailing: `${content.dailyGoalProgress}/${content.dailyGoalTarget} sessions`,
        },
        {
            label: "Streak",
            value: Math.min(100, content.streak * 10),
            trailing: `${content.streak} day${content.streak === 1 ? "" : "s"}`,
        },
        {
            label: "Subjects active",
            value: Math.min(100, content.subjects.length * 25),
            trailing: `${content.subjects.length} subject${content.subjects.length === 1 ? "" : "s"}`,
        },
    ];
}