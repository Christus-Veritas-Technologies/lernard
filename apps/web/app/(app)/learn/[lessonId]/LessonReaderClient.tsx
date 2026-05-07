"use client";

import { ArrowLeft01Icon } from "hugeicons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { LessonContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { browserApiFetch } from "@/lib/browser-api";

interface LessonReaderClientProps {
    lessonId: string;
}

export function LessonReaderClient({ lessonId }: LessonReaderClientProps) {
    const router = useRouter();
    const [lesson, setLesson] = useState<{ status: "generating" | "ready"; content?: LessonContent } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadLesson = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await browserApiFetch<{ status: "generating" | "ready"; content?: LessonContent }>(
                ROUTES.LESSONS.GET(lessonId),
            );
            setLesson(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Unable to load lesson."));
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    useEffect(() => { void loadLesson(); }, [loadLesson]);

    useEffect(() => {
        if (lesson?.status === "generating") {
            router.replace(`/learn/${lessonId}/loading`);
        }
    }, [lesson, lessonId, router]);

    if (loading) return <div className="h-72 rounded-3xl bg-background-subtle" />;

    if (error || !lesson) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load lesson</CardTitle>
                    <CardDescription>{error?.message ?? "Try again."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={loadLesson}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    if (lesson.status === "generating" || !lesson.content) {
        return null;
    }

    const content = lesson.content;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/learn">
                    <Button className="h-10 w-10 rounded-full p-0" variant="secondary">
                        <ArrowLeft01Icon size={16} strokeWidth={1.8} />
                    </Button>
                </Link>
                <Badge tone="cool">{content.subjectName}</Badge>
                <Progress className="max-w-60" value={15} />
                <span className="text-xs text-text-tertiary">~{content.estimatedMinutes} mins</span>
            </div>

            <ScrollArea className="max-h-[65vh] rounded-3xl border border-border p-4" orientation="vertical">
                <div className="space-y-4">
                    {content.sections.map((section, index) => (
                        <Card key={`${section.type}-${index}`}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {section.heading ?? section.type.toUpperCase()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">
                                    {section.body}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            <Button
                onClick={() =>
                    router.push(
                        `/learn/${lessonId}/complete?topic=${encodeURIComponent(content.topic)}`,
                    )
                }
            >
                I&apos;m done
            </Button>
        </div>
    );
}
