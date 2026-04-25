import type { Metadata } from "next";

import { LessonPageClient } from "./LessonPageClient";

interface LessonPageProps {
    params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
    const { lessonId } = await params;

    return {
        title: `Lesson ${lessonId} — Lernard`,
        description: "Open a generated lesson, continue reading, and keep your next study step in motion.",
    };
}

export default async function LessonPage({ params }: LessonPageProps) {
    const { lessonId } = await params;

    return <LessonPageClient lessonId={lessonId} />;
}
