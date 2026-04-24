interface ChildPageProps {
    params: Promise<{ childId: string }>;
}

interface TopicInsight {
    topic: string;
    level: string;
    score: number;
    lastTestedAt: string | null;
    subject: string;
}

import { PageHero } from "../../../../components/dashboard/PageHero";
import { PerformanceList } from "../../../../components/dashboard/PerformanceList";
import { StatCard } from "../../../../components/dashboard/StatCard";
import { TimelineList } from "../../../../components/dashboard/TimelineList";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/Card";
import { formatMinutes, formatPercent, formatRelativeDate } from "../../../../lib/formatters";
import { getChildProfileContent } from "../../../../lib/page-mock-data";

function getStrengthTone(strengthLevel: string) {
    if (strengthLevel === "strong") {
        return "success" as const;
    }

    if (strengthLevel === "developing") {
        return "warning" as const;
    }

    return "warm" as const;
}

export default async function ChildPage({ params }: ChildPageProps) {
    const { childId } = await params;
    const profile = getChildProfileContent(childId);
    const strongestTopics = profile.progress
        .flatMap((subject: (typeof profile.progress)[number]) =>
            subject.topics.map(
                (topic: (typeof subject.topics)[number]): TopicInsight => ({
                    ...topic,
                    subject: subject.subjectName,
                }),
            ),
        )
        .sort((left: TopicInsight, right: TopicInsight) => right.score - left.score)
        .slice(0, 3);
    const growthAreas = profile.progress
        .flatMap((subject: (typeof profile.progress)[number]) =>
            subject.topics.map(
                (topic: (typeof subject.topics)[number]): TopicInsight => ({
                    ...topic,
                    subject: subject.subjectName,
                }),
            ),
        )
        .sort((left: TopicInsight, right: TopicInsight) => left.score - right.score)
        .slice(0, 3);

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
                            value={`${profile.child.streak} days`}
                        />
                        <StatCard
                            detail="These subjects currently have enough data to give a reliable Read on You."
                            eyebrow="Coverage"
                            label="Tracked subjects"
                            tone="cool"
                            value={`${profile.progress.length}`}
                        />
                    </>
                }
                description={`Review ${profile.child.name}'s strongest subjects, growth areas, and recent session history before making any companion changes.`}
                eyebrow="Child overview"
                title={`${profile.child.name}'s Lernard snapshot`}
            >
                <Badge tone="primary">Child ID: {childId}</Badge>
                <Badge tone="warm">Last active {formatRelativeDate(profile.child.lastActiveAt)}</Badge>
                <Button>Open companion controls</Button>
                <Button variant="danger">Remove child</Button>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                {profile.progress.map((subject: (typeof profile.progress)[number]) => (
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
                ))}
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
                        <PerformanceList
                            items={profile.progress.map((subject: (typeof profile.progress)[number]) => ({
                                label: subject.subjectName,
                                value: subject.averageScore ?? 0,
                                trailing: formatPercent(subject.averageScore),
                            }))}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lernard's Read on You</CardTitle>
                            <CardDescription>
                                Clear signals on what feels secure and what deserves more practice next.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-text-primary">Strongest topics</p>
                                {strongestTopics.map((topic: TopicInsight) => (
                                    <div className="rounded-2xl bg-accent-cool-100 p-3" key={`${topic.subject}-${topic.topic}`}>
                                        <p className="text-sm font-semibold text-text-primary">{topic.topic}</p>
                                        <p className="mt-1 text-sm text-text-secondary">{topic.subject}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-text-primary">Growth areas</p>
                                {growthAreas.map((topic: TopicInsight) => (
                                    <div className="rounded-2xl bg-accent-warm-100 p-3" key={`${topic.subject}-${topic.topic}`}>
                                        <p className="text-sm font-semibold text-text-primary">{topic.topic}</p>
                                        <p className="mt-1 text-sm text-text-secondary">{topic.subject}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Next guardian actions</CardTitle>
                            <CardDescription>
                                The smallest changes likely to improve this learner's next few sessions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm leading-6 text-text-secondary">
                            <p>1. Keep hints enabled while English inference is still settling.</p>
                            <p>2. Queue one short maths refresher to maintain Ada's strongest subject.</p>
                            <p>3. Review recent quiz feedback before turning off answer reveals.</p>
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
                    <TimelineList
                        items={profile.recentSessions.map((session: (typeof profile.recentSessions)[number]) => ({
                            id: session.id,
                            title: `${session.subject} • ${session.topic}`,
                            description: `${session.type === "lesson" ? "Lesson" : "Quiz"} • ${formatMinutes(session.duration)} • ${session.xpEarned} XP earned`,
                            meta: formatRelativeDate(session.createdAt),
                            tone: session.type === "lesson" ? "cool" : "primary",
                        }))}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
