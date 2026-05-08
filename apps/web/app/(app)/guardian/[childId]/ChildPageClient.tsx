"use client";

import { motion } from "framer-motion";
import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type { ChildProfileContent } from "@lernard/shared-types";
import { useRouter } from "next/navigation";

import { PageHero } from "@/components/dashboard/PageHero";
import { PerformanceList } from "@/components/dashboard/PerformanceList";
import { StatCard } from "@/components/dashboard/StatCard";
import { TimelineList } from "@/components/dashboard/TimelineList";
import { GuardianEmptyVisual } from "@/components/guardian/GuardianEmptyVisual";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePagePayload } from "@/hooks/usePagePayload";
import { formatMinutes, formatPercent, formatRelativeDate } from "@/lib/formatters";

interface ChildPageClientProps {
    childId: string;
}

interface TopicInsight {
    topic: string;
    level: string;
    score: number;
    lastTestedAt: string | null;
    subject: string;
}

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

export function ChildPageClient({ childId }: ChildPageClientProps) {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildProfileContent>(
        ROUTES.GUARDIAN.CHILD_PAYLOAD(childId),
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>Child overview needs your guardian session</CardTitle>
                    <CardDescription>
                        Lernard can only load this learner&apos;s real progress once the guardian session is active.
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
                            <div className="h-10 w-2/3 rounded-2xl bg-background-subtle" />
                            <div className="h-24 w-full rounded-3xl bg-background-subtle" />
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
                    <CardTitle>Child overview could not load right now</CardTitle>
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
    const strongestTopics = collectTopicInsights(content, "strongest");
    const growthAreas = collectTopicInsights(content, "growth");

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="A steady streak keeps confidence high and revision calmer."
                            eyebrow="Momentum"
                            label="Current streak"
                            tone="primary"
                            value={`${content.child.streak} days`}
                        />
                        <StatCard
                            detail="These subjects currently have enough data to give a reliable Read on You."
                            eyebrow="Coverage"
                            label="Tracked subjects"
                            tone="cool"
                            value={`${content.progress.length}`}
                        />
                    </>
                }
                description={`Review ${content.child.name}'s strongest subjects, growth areas, and recent session history before making any companion changes.`}
                eyebrow="Child overview"
                title={`${content.child.name}'s Lernard snapshot`}
            >
                <Badge tone="primary">Child ID: {childId}</Badge>
                <Badge tone="warm">Last active {formatRelativeDate(content.child.lastActiveAt)}</Badge>
                <Button
                    disabled={!can(permissions, "can_change_companion_controls", childId)}
                    onClick={() => router.push(`/guardian/${childId}/companion`)}
                >
                    Open companion controls
                </Button>
                <Button variant="danger">Remove child</Button>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                {content.progress.length ? (
                    content.progress.map((subject) => (
                        <Card key={subject.subjectId}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>{subject.subjectName}</CardTitle>
                                        <CardDescription>
                                            Last active {formatRelativeDate(subject.lastActiveAt)}
                                        </CardDescription>
                                    </div>
                                    <Badge tone={getStrengthTone(subject.strengthLevel)}>
                                        {subject.strengthLevel.replace("_", " ")}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-text-secondary">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Total lessons</span>
                                    <span className="font-medium text-text-primary">{subject.totalLessons}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span>Total quizzes</span>
                                    <span className="font-medium text-text-primary">{subject.totalQuizzes}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span>Average score</span>
                                    <span className="font-medium text-text-primary">
                                        {formatPercent(subject.averageScore)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <GuardianEmptyVisual
                        className="lg:col-span-3"
                        subtitle="Subject cards will appear after lessons or quizzes are completed."
                        title="No subject progress yet"
                    />
                )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Subject comparison</CardTitle>
                        <CardDescription>
                            A quick chart of subject averages so you can spot where extra support will matter most.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PerformanceList items={buildSubjectComparisonItems(content)} />
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lernard&apos;s Read on You</CardTitle>
                            <CardDescription>
                                Clear signals on what feels secure and what deserves more practice next.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-text-primary">Strongest topics</p>
                                {strongestTopics.length ? (
                                    strongestTopics.map((topic) => (
                                        <div className="rounded-2xl bg-accent-cool-100 p-3" key={`${topic.subject}-${topic.topic}`}>
                                            <p className="text-sm font-semibold text-text-primary">{topic.topic}</p>
                                            <p className="mt-1 text-sm text-text-secondary">{topic.subject}</p>
                                        </div>
                                    ))
                                ) : (
                                    <GuardianEmptyVisual
                                        subtitle="Strong topics appear here as activity builds."
                                        title="Strongest topics pending"
                                    />
                                )}
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-text-primary">Growth areas</p>
                                {growthAreas.length ? (
                                    growthAreas.map((topic) => (
                                        <div className="rounded-2xl bg-accent-warm-100 p-3" key={`${topic.subject}-${topic.topic}`}>
                                            <p className="text-sm font-semibold text-text-primary">{topic.topic}</p>
                                            <p className="mt-1 text-sm text-text-secondary">{topic.subject}</p>
                                        </div>
                                    ))
                                ) : (
                                    <GuardianEmptyVisual
                                        subtitle="Growth areas appear once enough scored work is available."
                                        title="Growth map pending"
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Next guardian actions</CardTitle>
                            <CardDescription>
                                The smallest changes likely to improve this learner&apos;s next few sessions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm leading-6 text-text-secondary">
                            {buildGuardianActions(content).map((action) => (
                                <p key={action}>{action}</p>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle>Recent sessions</CardTitle>
                            <CardDescription>
                                The latest lesson and quiz activity, ready for a quick review.
                            </CardDescription>
                        </div>
                        <Button variant="secondary">Load more history</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {content.recentSessions.length ? (
                        <TimelineList
                            items={content.recentSessions.map((session) => ({
                                id: session.id,
                                title: `${session.subject} • ${session.topic}`,
                                description: `${session.type === "lesson" ? "Lesson" : "Quiz"} • ${formatMinutes(session.duration)} • ${session.xpEarned} XP earned`,
                                meta: formatRelativeDate(session.createdAt),
                                tone: session.type === "lesson" ? "cool" : "primary",
                            }))}
                        />
                    ) : (
                        <GuardianEmptyVisual
                            subtitle="Lesson and quiz sessions will appear here as a timeline."
                            title="No session history yet"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function collectTopicInsights(content: ChildProfileContent, mode: "strongest" | "growth") {
    const topics = content.progress
        .flatMap((subject) =>
            subject.topics.map(
                (topic): TopicInsight => ({
                    ...topic,
                    subject: subject.subjectName,
                }),
            ),
        )
        .sort((left, right) => mode === "strongest" ? right.score - left.score : left.score - right.score)
        .slice(0, 3);

    return topics;
}

function buildSubjectComparisonItems(content: ChildProfileContent) {
    if (!content.progress.length) {
        return [
            {
                label: "Progress tracking",
                value: 10,
                trailing: "Waiting for first scored activity",
            },
        ];
    }

    return content.progress.map((subject) => ({
        label: subject.subjectName,
        value: subject.averageScore ?? 0,
        trailing: formatPercent(subject.averageScore),
    }));
}

function buildGuardianActions(content: ChildProfileContent) {
    const firstGrowthArea = collectTopicInsights(content, "growth")[0];
    const strongestTopic = collectTopicInsights(content, "strongest")[0];

    return [
        firstGrowthArea
            ? `1. Keep hints enabled while ${firstGrowthArea.topic.toLowerCase()} is still settling.`
            : "1. Keep companion supports steady until more progress data is available.",
        strongestTopic
            ? `2. Queue one short refresher in ${strongestTopic.subject} to keep ${strongestTopic.topic.toLowerCase()} warm.`
            : "2. Use one short recap lesson to build a fresh baseline this week.",
        "3. Review recent quiz feedback before tightening answer reveals or skip support.",
    ];
}