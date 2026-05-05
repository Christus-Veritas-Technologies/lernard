"use client";

import { BookOpen01Icon } from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ROUTES } from "@lernard/routes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { browserApiFetch } from "@/lib/browser-api";

interface LessonLoadingClientProps {
    lessonId: string;
}

export function LessonLoadingClient({ lessonId }: LessonLoadingClientProps) {
    const router = useRouter();

    useEffect(() => {
        let active = true;

        const timer = setInterval(() => {
            void browserApiFetch<{ status: "generating" | "ready" }>(ROUTES.LESSONS.GET(lessonId))
                .then((result) => {
                    if (!active) return;
                    if (result.status === "ready") {
                        clearInterval(timer);
                        router.replace(`/learn/${lessonId}`);
                    }
                })
                .catch(() => undefined);
        }, 2000);

        return () => {
            active = false;
            clearInterval(timer);
        };
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
