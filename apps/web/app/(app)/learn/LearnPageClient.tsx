"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import { SessionDepth, type Lesson, type LearnContent } from "@lernard/shared-types";

import { ActionCard } from "@/components/dashboard/ActionCard";
import { PageHero } from "@/components/dashboard/PageHero";
import { PerformanceList } from "@/components/dashboard/PerformanceList";
import { TimelineList } from "@/components/dashboard/TimelineList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";
import { formatMinutes } from "@/lib/formatters";

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

export function LearnPageClient() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<LearnContent>(
        ROUTES.LEARN.PAYLOAD,
    );

    const [topic, setTopic] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
    const [selectedDepth, setSelectedDepth] = useState<SessionDepth | undefined>(undefined);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    async function handleGenerate(overrideTopic?: string, overrideDepth?: SessionDepth) {
        const finalTopic = (overrideTopic ?? topic).trim();
        if (!finalTopic) return;

        setIsGenerating(true);
        setGenerateError(null);
        try {
            const lesson = await browserApiFetch<Lesson>(ROUTES.LESSONS.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: finalTopic,
                    subjectId: selectedSubjectId,
                    depth: overrideDepth ?? selectedDepth ?? data?.content.preferredDepth ?? "standard",
                    idempotencyKey: crypto.randomUUID(),
                }),
            });
            router.push(`/learn/${lesson.id}`);
        } catch (e) {
            setGenerateError(e instanceof Error ? e.message : "Failed to generate lesson. Please try again.");
            setIsGenerating(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>Lesson studio needs your session</CardTitle>
                    <CardDescription>
                        Lernard can only load your live recommendations and drafts after you sign in.
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
                        <div className="h-44 rounded-3xl bg-background-subtle" />
                    </CardContent>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-80 rounded-3xl bg-background-subtle" />
                    <div className="h-80 rounded-3xl bg-background-subtle" />
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
                    <CardTitle>Learn could not load right now</CardTitle>
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
    const topRecommendation = content.recommendations[0] ?? null;
    const canStartLesson = can(permissions, "can_start_lesson");
    const effectiveDepth = selectedDepth ?? content.preferredDepth;

    // Initialise selectedSubjectId once subjects are loaded
    if (selectedSubjectId === undefined && content.subjects.length > 0) {
        setSelectedSubjectId(content.subjects[0]!.subjectId);
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Tonight&apos;s best next step</CardTitle>
                            <CardDescription>
                                {topRecommendation
                                    ? topRecommendation.reason
                                    : "Your next recommendation will appear here as soon as Lernard has enough signal to rank one."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {topRecommendation ? (
                                <>
                                    <Badge tone="primary">{topRecommendation.subject}</Badge>
                                    <p className="text-sm leading-6 text-text-secondary">
                                        {formatDepthLabel(topRecommendation.depth)} • {formatMinutes(topRecommendation.estimatedMinutes)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm leading-6 text-text-secondary">
                                    Start with a fresh topic below and Lernard will build from there.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                }
                description="Generate a lesson from scratch, jump into a recommended topic, or reopen a draft without losing your flow."
                eyebrow="Lesson studio"
                title="Build the right lesson for right now"
            >
                {content.focusTopic ? <Badge tone="warm">Focus area: {content.focusTopic}</Badge> : null}
                <Badge tone="cool">Preferred depth: {formatDepthLabel(content.preferredDepth)}</Badge>
                <Button
                    disabled={!canStartLesson || isGenerating || !topic.trim()}
                    onClick={() => void handleGenerate()}
                >
                    {isGenerating ? "Generating…" : "Generate lesson"}
                </Button>
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
                        <form
                            className="grid gap-4 sm:grid-cols-2"
                            onSubmit={(e) => { e.preventDefault(); void handleGenerate(); }}
                        >
                            <label className="space-y-2 sm:col-span-2">
                                <span className="text-sm font-medium text-text-primary">Topic</span>
                                <input
                                    className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300"
                                    maxLength={300}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="What do you want to learn today?"
                                    type="text"
                                    value={topic}
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-medium text-text-primary">Subject</span>
                                <select
                                    className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300"
                                    onChange={(e) => {
                                        const s = content.subjects.find((sub) => sub.name === e.target.value);
                                        setSelectedSubjectId(s?.subjectId);
                                    }}
                                    value={content.subjects.find((s) => s.subjectId === selectedSubjectId)?.name ?? ""}
                                >
                                    {content.subjects.length ? (
                                        content.subjects.map((subject) => (
                                            <option key={subject.subjectId}>{subject.name}</option>
                                        ))
                                    ) : (
                                        <option>No subjects yet</option>
                                    )}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-medium text-text-primary">Session length</span>
                                <select
                                    className="min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-text-primary outline-none transition focus:border-primary-300"
                                    defaultValue={getSessionLengthLabel(content.preferredSessionLength)}
                                >
                                    <option>10 minutes</option>
                                    <option>15 minutes</option>
                                    <option>20 minutes</option>
                                </select>
                            </label>
                            <div className="space-y-2 sm:col-span-2">
                                <span className="text-sm font-medium text-text-primary">Depth</span>
                                <div className="flex flex-wrap gap-2">
                                    {([SessionDepth.QUICK, SessionDepth.STANDARD, SessionDepth.DEEP] as const).map((depth) => (
                                        <button
                                            className="cursor-pointer"
                                            key={depth}
                                            onClick={() => setSelectedDepth(depth)}
                                            type="button"
                                        >
                                            <Badge tone={depth === effectiveDepth ? "primary" : "muted"}>
                                                {formatDepthLabel(depth)}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>
                        {generateError ? <p className="mt-3 text-sm text-red-600">{generateError}</p> : null}
                    </CardContent>
                    <CardFooter>
                        <Button
                            disabled={!canStartLesson || isGenerating || !topic.trim()}
                            onClick={() => void handleGenerate()}
                        >
                            {isGenerating ? "Generating…" : "Generate lesson"}
                        </Button>
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
                        {content.recommendations.length ? (
                            content.recommendations.map((recommendation) => (
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
                                        <Badge tone="muted">{formatDepthLabel(recommendation.depth)}</Badge>
                                        <Badge tone="warm">{formatMinutes(recommendation.estimatedMinutes)}</Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm leading-6 text-text-secondary">
                                No recommendations are ready yet. Generate a lesson below and Lernard will start learning your rhythm.
                            </p>
                        )}
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
                        <PerformanceList items={buildRevisitItems(content)} />
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
                            {content.drafts.length ? (
                                <TimelineList
                                    items={content.drafts.map((draft) => ({
                                        id: draft.id,
                                        title: `${draft.subject} • ${draft.topic}`,
                                        description: draft.status,
                                        meta: draft.nextStep,
                                        tone: "primary" as const,
                                        href: `/learn/${draft.id}`,
                                    }))}
                                />
                            ) : (
                                <p className="text-sm leading-6 text-text-secondary">
                                    You don&apos;t have any unfinished lessons right now. Fresh starts will appear here once you save or pause one.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {content.recommendations.length ? (
                            content.recommendations.map((recommendation) => (
                                <ActionCard
                                    description={recommendation.reason}
                                    detail={`${formatDepthLabel(recommendation.depth)} • ${formatMinutes(recommendation.estimatedMinutes)}`}
                                    eyebrow={recommendation.subject}
                                    key={`${recommendation.subject}-${recommendation.topic}`}
                                    primaryAction={isGenerating ? "Generating…" : "Start now"}
                                    title={recommendation.topic}
                                    footer={
                                        <Button
                                            className="w-full"
                                            disabled={!canStartLesson || isGenerating}
                                            onClick={() => void handleGenerate(recommendation.topic, recommendation.depth as SessionDepth)}
                                            size="sm"
                                        >
                                            {isGenerating ? "Generating…" : "Start now"}
                                        </Button>
                                    }
                                />
                            ))
                        ) : (
                            <div className="rounded-3xl border border-dashed border-border bg-surface p-5 text-sm leading-6 text-text-secondary sm:col-span-2 xl:col-span-3">
                                As soon as Lernard has more signal from your recent sessions, this recommendation grid will fill with live lesson ideas.
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </div>
    );
}

function buildRevisitItems(content: LearnContent) {
    if (!content.recommendations.length) {
        return [
            {
                label: "New lesson queue",
                value: 20,
                trailing: "Waiting for more activity",
            },
        ];
    }

    return content.recommendations.slice(0, 3).map((recommendation) => ({
        label: `${recommendation.subject} • ${recommendation.topic}`,
        value: getDepthPriority(recommendation.depth),
        trailing: formatDepthLabel(recommendation.depth),
    }));
}

function formatDepthLabel(depth: SessionDepth) {
    switch (depth) {
        case SessionDepth.QUICK:
            return "Quick refresher";
        case SessionDepth.DEEP:
            return "Deep dive";
        case SessionDepth.STANDARD:
        default:
            return "Standard session";
    }
}

function getDepthPriority(depth: SessionDepth) {
    switch (depth) {
        case SessionDepth.DEEP:
            return 82;
        case SessionDepth.STANDARD:
            return 64;
        case SessionDepth.QUICK:
        default:
            return 46;
    }
}

function getSessionLengthLabel(preferredSessionLength: number | null) {
    if (!preferredSessionLength) {
        return "15 minutes";
    }

    return `${preferredSessionLength} minutes`;
}