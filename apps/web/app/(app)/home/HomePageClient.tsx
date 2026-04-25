"use client";

import { motion } from "framer-motion";
import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type { HomeContent } from "@lernard/shared-types";

import { ActionCard } from "@/components/dashboard/ActionCard";
import { PageHero } from "@/components/dashboard/PageHero";
import { PerformanceList } from "@/components/dashboard/PerformanceList";
import { StatCard } from "@/components/dashboard/StatCard";
import { TimelineList } from "@/components/dashboard/TimelineList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePagePayload } from "@/hooks/usePagePayload";
import { formatRelativeDate, formatSessionsLabel } from "@/lib/formatters";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

function getStrengthTone(strengthLevel: string) {
    if (strengthLevel === "strong") {
        return "success" as const;
    }

    if (strengthLevel === "developing") {
        return "warning" as const;
    }

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
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
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
                <Card className="overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
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
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="h-52 rounded-3xl bg-background-subtle" />
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
                    <Badge className="w-fit" tone="warning">
                        Live payload failed
                    </Badge>
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

    const { content, permissions } = data;
    const dailyGoalPercent = Math.round(
        (content.dailyGoalProgress / Math.max(content.dailyGoalTarget, 1)) * 100,
    );
    const quickActions = buildQuickActions(content);
    const weeklyMomentum = buildWeeklyMomentum(content, dailyGoalPercent);
    const showEmptyDashboard = !content.subjects.length && !content.recentSessions.length && !content.lastLesson;

    if (showEmptyDashboard) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="primary">
                        Fresh start
                    </Badge>
                    <CardTitle>{content.greeting}</CardTitle>
                    <CardDescription>
                        Your first live Home payload is connected. As soon as lessons or subjects are added,
                        this dashboard will fill with real progress and activity.
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
                            detail="Your daily goal is nearly in the bag. One short session finishes it."
                            eyebrow="Today"
                            label="Goal progress"
                            progress={dailyGoalPercent}
                            tone="primary"
                            value={`${content.dailyGoalProgress}/${content.dailyGoalTarget}`}
                        />
                        <StatCard
                            detail="You've kept momentum through lessons, quizzes, and chat support."
                            eyebrow="Current level"
                            label="XP level"
                            tone="cool"
                            value={`Level ${content.xpLevel}`}
                        />
                    </>
                }
                description="Pick up where you left off, strengthen a growth area, or start a fresh sprint with Lernard ready to guide the next step."
                eyebrow="Your dashboard"
                title={content.greeting}
            >
                <Badge tone="success">{content.streak}-day streak</Badge>
                <Badge tone="primary">{formatSessionsLabel(content.recentSessions.length)} this week</Badge>
                {content.subjects[0] ? <Badge tone="warm">Focus area: {content.subjects[0].name}</Badge> : null}
                <Button disabled={!can(permissions, "can_start_lesson") || !content.lastLesson}>
                    Resume last lesson
                </Button>
                <Button variant="secondary">Open chat</Button>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                {quickActions.map((action) => (
                    <ActionCard key={action.title} {...action} />
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle>Subject focus</CardTitle>
                                <CardDescription>
                                    Keep the strongest subjects warm while giving growth areas deliberate attention.
                                </CardDescription>
                            </div>
                            <Button variant="secondary">Manage subjects</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {content.subjects.length ? (
                            content.subjects.map((subject) => (
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
                                            <span>Priority in your queue</span>
                                            <span>#{subject.priorityIndex + 1}</span>
                                        </div>
                                        <Progress value={Math.max(20, 100 - subject.priorityIndex * 20)} />
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button className="flex-1" variant="secondary">
                                            Continue
                                        </Button>
                                        <Button className="flex-1" disabled={!can(permissions, "can_take_quiz")}>
                                            Practice
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm leading-6 text-text-secondary sm:col-span-2 xl:col-span-3">
                                No subjects have been added yet. Once onboarding or topic selection is complete,
                                they will appear here with real strength signals.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weekly momentum</CardTitle>
                            <CardDescription>
                                A quick read on how steady your study rhythm has felt this week.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PerformanceList items={weeklyMomentum} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent sessions</CardTitle>
                            <CardDescription>
                                The latest lessons and quizzes you can jump back into.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {content.recentSessions.length ? (
                                <TimelineList
                                    items={content.recentSessions.map((session) => ({
                                        id: session.id,
                                        title: `${session.subject} • ${session.topic}`,
                                        description:
                                            session.type === "lesson"
                                                ? "Lesson completed with recap notes ready."
                                                : "Quiz finished and ready for review.",
                                        meta: formatRelativeDate(session.createdAt),
                                        tone: session.type === "lesson" ? "cool" : "primary",
                                    }))}
                                />
                            ) : (
                                <p className="text-sm leading-6 text-text-secondary">
                                    Your latest lesson and quiz activity will appear here once you finish a session.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function buildQuickActions(content: HomeContent) {
    const topSubject = content.subjects[0]?.name ?? "Your next subject";
    const recentSession = content.recentSessions[0];

    return [
        {
            title: content.lastLesson ? `Resume ${content.lastLesson.topic}` : "Start a new lesson",
            description: content.lastLesson
                ? `Pick up your unfinished ${content.lastLesson.subject} lesson without losing the thread.`
                : "Kick off a fresh lesson from the Learn page with a live topic recommendation.",
            eyebrow: "Next up",
            primaryAction: content.lastLesson ? "Resume lesson" : "Open Learn",
            secondaryAction: "Open chat",
            detail: content.lastLesson?.subject ?? "Lernard will suggest the best next topic.",
        },
        {
            title: `Revisit ${topSubject}`,
            description: "Stay close to the subject with the highest priority in your current queue.",
            eyebrow: "Focus",
            primaryAction: "Continue",
            secondaryAction: "Practice",
            detail: content.subjects[0]
                ? `Priority #${content.subjects[0].priorityIndex + 1}`
                : "A focused subject will appear here once one is added.",
        },
        {
            title: recentSession ? `Review ${recentSession.topic}` : "Build momentum",
            description: recentSession
                ? "Use your most recent session as the easiest way back into study mode."
                : "Once you complete a lesson or quiz, your freshest work will appear here.",
            eyebrow: "Recent work",
            primaryAction: recentSession ? "Review session" : "Start now",
            secondaryAction: "See history",
            detail: recentSession
                ? `${recentSession.subject} • ${formatRelativeDate(recentSession.createdAt)}`
                : "No completed sessions yet.",
        },
    ];
}

function buildWeeklyMomentum(content: HomeContent, dailyGoalPercent: number) {
    return [
        {
            label: "Daily goal",
            value: Math.min(100, dailyGoalPercent),
            trailing: `${content.dailyGoalProgress}/${content.dailyGoalTarget} complete`,
        },
        {
            label: "Study rhythm",
            value: Math.min(100, content.recentSessions.length * 20),
            trailing: formatSessionsLabel(content.recentSessions.length),
        },
        {
            label: "Subject coverage",
            value: Math.min(100, content.subjects.length * 25),
            trailing: content.subjects.length ? `${content.subjects.length} active subjects` : "No subjects yet",
        },
    ];
}