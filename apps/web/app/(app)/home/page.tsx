import type { Metadata } from "next";

import { ActionCard } from "../../../components/dashboard/ActionCard";
import { PageHero } from "../../../components/dashboard/PageHero";
import { PerformanceList } from "../../../components/dashboard/PerformanceList";
import { StatCard } from "../../../components/dashboard/StatCard";
import { TimelineList } from "../../../components/dashboard/TimelineList";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { formatRelativeDate, formatSessionsLabel } from "../../../lib/formatters";
import { homeContent, homeQuickActions, weeklyMomentum } from "../../../lib/page-mock-data";

export const metadata: Metadata = {
    title: "Home — Lernard",
    description: "Your personal learning dashboard with quick starts, momentum, and recent sessions.",
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

export default function HomePage() {
    const dailyGoalPercent = Math.round(
        (homeContent.dailyGoalProgress / homeContent.dailyGoalTarget) * 100,
    );

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
                            value={`${homeContent.dailyGoalProgress}/${homeContent.dailyGoalTarget}`}
                        />
                        <StatCard
                            detail="You've kept momentum through lessons, quizzes, and chat support."
                            eyebrow="Current level"
                            label="XP level"
                            tone="cool"
                            value={`Level ${homeContent.xpLevel}`}
                        />
                    </>
                }
                description="Pick up where you left off, strengthen a growth area, or start a fresh sprint with Lernard ready to guide the next step."
                eyebrow="Your dashboard"
                title={homeContent.greeting}
            >
                <Badge tone="success">{homeContent.streak}-day streak</Badge>
                <Badge tone="primary">{formatSessionsLabel(homeContent.recentSessions.length)} this week</Badge>
                <Badge tone="warm">Focus area: English inference</Badge>
                <Button>Resume last lesson</Button>
                <Button variant="secondary">Open chat</Button>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                {homeQuickActions.map((action) => (
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
                        {homeContent.subjects.map((subject: (typeof homeContent.subjects)[number]) => (
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
                                    <ProgressBar value={100 - subject.priorityIndex * 25} />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button className="flex-1" variant="secondary">
                                        Continue
                                    </Button>
                                    <Button className="flex-1">Practice</Button>
                                </div>
                            </div>
                        ))}
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
                            <TimelineList
                                items={homeContent.recentSessions.map((session: (typeof homeContent.recentSessions)[number]) => ({
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
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
