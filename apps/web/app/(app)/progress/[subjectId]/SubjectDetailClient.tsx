"use client";

import { ArrowLeft01Icon } from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { SubjectDetailContent, TopicStrength } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { usePagePayload } from "@/hooks/usePagePayload";

interface SubjectDetailClientProps {
    subjectId: string;
}

export function SubjectDetailClient({ subjectId }: SubjectDetailClientProps) {
    const { data, loading, error, refetch } =
        usePagePayload<SubjectDetailContent>(ROUTES.PROGRESS.SUBJECT(subjectId));

    if (loading) {
        return <div className="h-64 rounded-3xl bg-background-subtle" />;
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load subject</CardTitle>
                    <CardDescription>{error?.message ?? "Try again."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    const subject = data.content.subject;
    const average =
        subject.topics.length > 0
            ? Math.round(subject.topics.reduce((sum, topic) => sum + topic.score, 0) / subject.topics.length)
            : 0;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <Link href="/progress">
                    <Button className="h-10 w-10 rounded-full p-0" variant="secondary">
                        <ArrowLeft01Icon size={16} strokeWidth={1.8} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary">{subject.subjectName}</h1>
                    <p className="text-sm text-text-secondary">Overall strength</p>
                </div>
            </div>

            <Card>
                <CardContent className="mt-0 space-y-2">
                    <Progress value={average} />
                    <p className="text-sm text-text-secondary">{average}% average strength</p>
                </CardContent>
            </Card>

            <TopicSection
                color="success"
                title="Confident"
                topics={subject.topics.filter((topic) => topic.level === "confident")}
            />
            <TopicSection
                color="warning"
                title="Getting There"
                topics={subject.topics.filter((topic) => topic.level === "getting_there")}
            />
            <TopicSection
                color="warm"
                title="Needs Work"
                topics={subject.topics.filter((topic) => topic.level === "needs_work")}
                showStudyAction
            />
        </div>
    );
}

function TopicSection({
    title,
    topics,
    color,
    showStudyAction = false,
}: {
    title: string;
    topics: TopicStrength[];
    color: "success" | "warning" | "warm";
    showStudyAction?: boolean;
}) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <Badge tone={color}>{topics.length}</Badge>
            </div>

            {topics.length === 0 ? (
                <Card>
                    <CardContent className="mt-0 text-sm text-text-secondary">No topics here yet.</CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {topics.map((topic) => (
                        <Card key={topic.topic}>
                            <CardHeader>
                                <CardTitle className="text-base">{topic.topic}</CardTitle>
                                <CardDescription>
                                    Score {topic.score}% • Last studied {formatDate(topic.lastTestedAt)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={topic.score} />
                                {showStudyAction ? (
                                    <Link href={`/learn?topic=${encodeURIComponent(topic.topic)}`}>
                                        <Button>Study this now</Button>
                                    </Link>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}

function formatDate(value: string | null): string {
    if (!value) return "never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "never";
    return d.toLocaleDateString();
}
