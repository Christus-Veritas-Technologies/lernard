import type { Metadata } from "next";

import { LessonCompleteClient } from "./LessonCompleteClient";

interface LessonCompleteProps {
    params: Promise<{ lessonId: string }>;
    searchParams: Promise<{ xp?: string; topic?: string; subject?: string; summary?: string }>;
}

export async function generateMetadata({ params }: LessonCompleteProps): Promise<Metadata> {
    const { lessonId } = await params;
    return {
        title: `Lesson Complete ${lessonId} — Lernard`,
        description: "See the completion state for a finished lesson and stay ready for the next guided step.",
    };
}

export default async function LessonCompletePage({ params, searchParams }: LessonCompleteProps) {
    const { lessonId } = await params;
    const sp = await searchParams;
    const xpEarned = Number(sp.xp ?? 0);
    const topic = sp.topic ?? "Lesson";
    const subject = sp.subject ?? "";
    let summary: string[] = [];
    try {
        summary = sp.summary ? (JSON.parse(sp.summary) as string[]) : [];
    } catch {
        summary = [];
    }

    return (
        <LessonCompleteClient
            lessonId={lessonId}
            subject={subject}
            summary={summary}
            topic={topic}
            xpEarned={xpEarned}
        />
    );
}
