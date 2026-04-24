import type { Metadata } from "next";

import { ActionCard } from "../../../components/dashboard/ActionCard";
import { PageHero } from "../../../components/dashboard/PageHero";
import { PerformanceList } from "../../../components/dashboard/PerformanceList";
import { TimelineList } from "../../../components/dashboard/TimelineList";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/Card";
import { formatMinutes } from "../../../lib/formatters";
import { learnDrafts, learnRecommendations } from "../../../lib/page-mock-data";

export const metadata: Metadata = {
    title: "Learn — Lernard",
    description: "Build a lesson, revisit growth areas, and keep unfinished work moving.",
};

export default function LearnPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Tonight's best next step</CardTitle>
                                <CardDescription>
                                    Fractions on number lines will reinforce the lesson you paused this morning.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Badge tone="primary">Mathematics</Badge>
                                <p className="text-sm leading-6 text-text-secondary">
                                    Quick refresher • {formatMinutes(12)} • high confidence payoff
                                </p>
                            </CardContent>
                        </Card>
                    </>
                }
                description="Generate a lesson from scratch, jump into a recommended topic, or reopen a draft without losing your flow."
                eyebrow="Lesson studio"
                title="Build the right lesson for right now"
            >
                <Badge tone="warm">Growth area: inference</Badge>
                <Badge tone="cool">Preferred depth: standard</Badge>
                <Button>Generate lesson</Button>
            </PageHero>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Generate a lesson</CardTitle>
                        <CardDescription>
                            One focused topic, one clean starting point, and Lernard handles the rest.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2 sm:col-span-2">
                                <span className="text-sm font-medium text-text-primary">Topic</span>
                                <input
                                    className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300"
                                    defaultValue="Fractions on number lines"
                                    maxLength={300}
                                    placeholder="What do you want to learn today?"
                                    type="text"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-medium text-text-primary">Subject</span>
                                <select className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300" defaultValue="Mathematics">
                                    <option>Mathematics</option>
                                    <option>Science</option>
                                    <option>English</option>
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-medium text-text-primary">Session length</span>
                                <select className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300" defaultValue="15 minutes">
                                    <option>10 minutes</option>
                                    <option>15 minutes</option>
                                    <option>20 minutes</option>
                                </select>
                            </label>
                            <div className="space-y-2 sm:col-span-2">
                                <span className="text-sm font-medium text-text-primary">Depth</span>
                                <div className="flex flex-wrap gap-2">
                                    <Badge tone="primary">Quick refresher</Badge>
                                    <Badge tone="muted">Standard session</Badge>
                                    <Badge tone="muted">Deep dive</Badge>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button>Generate lesson</Button>
                        <Button variant="secondary">Save for later</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recommended quick starts</CardTitle>
                        <CardDescription>
                            Lessons Lernard can spin up fastest based on your recent work.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {learnRecommendations.map((recommendation) => (
                            <div className="rounded-2xl border border-border bg-background/60 p-4" key={recommendation.topic}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">
                                            {recommendation.topic}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-text-secondary">
                                            {recommendation.reason}
                                        </p>
                                    </div>
                                    <Badge tone="cool">{recommendation.subject}</Badge>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge tone="muted">{recommendation.depth}</Badge>
                                    <Badge tone="warm">{formatMinutes(recommendation.estimatedMinutes)}</Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Where to revisit next</CardTitle>
                        <CardDescription>
                            A simple priority chart based on what will move your understanding forward fastest.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PerformanceList
                            items={[
                                { label: "English inference", value: 82, trailing: "Highest priority" },
                                { label: "Particle movement", value: 68, trailing: "Worth a quick recap" },
                                { label: "Fractions fluency", value: 58, trailing: "Keep warm" },
                            ]}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Unfinished and saved lessons</CardTitle>
                            <CardDescription>
                                Jump back into anything paused before you lose the thread.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TimelineList
                                items={learnDrafts.map((draft) => ({
                                    id: draft.id,
                                    title: `${draft.subject} • ${draft.topic}`,
                                    description: draft.status,
                                    meta: draft.nextStep,
                                    tone: "primary",
                                }))}
                            />
                        </CardContent>
                    </Card>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {learnRecommendations.map((recommendation) => (
                            <ActionCard
                                description={recommendation.reason}
                                detail={`${recommendation.depth} • ${formatMinutes(recommendation.estimatedMinutes)}`}
                                eyebrow={recommendation.subject}
                                key={`${recommendation.subject}-${recommendation.topic}`}
                                primaryAction="Start now"
                                secondaryAction="Queue next"
                                title={recommendation.topic}
                            />
                        ))}
                    </section>
                </div>
            </section>
        </div>
    );
}
