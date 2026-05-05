"use client";

import { ArrowLeft01Icon } from "hugeicons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ROUTES } from "@lernard/routes";
import type { LessonContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePagePayload } from "@/hooks/usePagePayload";

interface LessonReaderClientProps {
    lessonId: string;
}

export function LessonReaderClient({ lessonId }: LessonReaderClientProps) {
    const router = useRouter();
    const { data, loading, error, refetch } =
        usePagePayload<{ status: "generating" | "ready"; content?: LessonContent }>(
            ROUTES.LESSONS.GET(lessonId),
        );

    if (loading) return <div className="h-72 rounded-3xl bg-background-subtle" />;

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load lesson</CardTitle>
                    <CardDescription>{error?.message ?? "Try again."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    if (data.status === "generating" || !data.content) {
        router.replace(`/learn/${lessonId}/loading`);
        return null;
    }

    const lesson = data.content;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <Link href="/learn">
                    <Button className="h-10 w-10 rounded-full p-0" variant="secondary">
                        <ArrowLeft01Icon size={16} strokeWidth={1.8} />
                    </Button>
                </Link>
                <Badge tone="cool">{lesson.subjectName}</Badge>
                <Progress className="max-w-60" value={15} />
                <span className="text-xs text-text-tertiary">~{lesson.estimatedMinutes} mins</span>
            </div>

            <ScrollArea className="max-h-[65vh] rounded-3xl border border-border p-4" orientation="vertical">
                <div className="space-y-4">
                    {lesson.sections.map((section, index) => (
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

            <Button onClick={() => router.push(`/learn/${lessonId}/complete`)}>I&apos;m done</Button>
        </div>
    );
}
