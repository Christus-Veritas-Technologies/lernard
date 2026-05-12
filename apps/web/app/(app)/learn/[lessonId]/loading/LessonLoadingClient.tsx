"use client";

import { BookOpen01Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ROUTES } from "@lernard/routes";
import type { LessonStreamEvent } from "@lernard/shared-types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { connectSse } from "@/lib/browser-api";

interface LessonLoadingClientProps {
    lessonId: string;
}

export function LessonLoadingClient({ lessonId }: LessonLoadingClientProps) {
    const router = useRouter();

    useEffect(() => {
        const abortController = new AbortController();
        let navigated = false;

        void (async () => {
            try {
                const body = await connectSse(ROUTES.LESSONS.STREAM(lessonId), abortController.signal);
                const reader = body.getReader();
                const decoder = new TextDecoder();
                let partial = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    partial += decoder.decode(value, { stream: true });
                    const lines = partial.split("\n");
                    partial = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        try {
                            const event = JSON.parse(line.slice(6)) as LessonStreamEvent;
                            if ((event.type === "section" || event.type === "done") && !navigated) {
                                navigated = true;
                                abortController.abort();
                                router.replace(`/learn/${lessonId}`);
                                return;
                            }
                            if (event.type === "error" && !navigated) {
                                // On error still navigate — LessonReaderClient handles failure state
                                navigated = true;
                                abortController.abort();
                                router.replace(`/learn/${lessonId}`);
                                return;
                            }
                        } catch {
                            // skip malformed lines
                        }
                    }
                }

                if (!navigated) {
                    router.replace(`/learn/${lessonId}`);
                }
            } catch {
                if (!navigated && !abortController.signal.aborted) {
                    router.replace(`/learn/${lessonId}`);
                }
            }
        })();

        return () => { abortController.abort(); };
    }, [lessonId, router]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen01Icon className="animate-pulse text-primary-500" size={20} />
                    Building your lesson
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-sm text-text-secondary">Lernard is shaping this to your level and goal.</p>
                <div className="h-3 w-full animate-pulse rounded-full bg-background-subtle" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-background-subtle" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-background-subtle" />
            </CardContent>
        </Card>
    );
}
