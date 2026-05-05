import type { Metadata } from "next";

import { LessonReaderClient } from "./LessonReaderClient";

interface LessonReaderPageProps {
    params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: LessonReaderPageProps): Promise<Metadata> {
    const { lessonId } = await params;
    return {
        title: `Lesson ${lessonId} — Lernard`,
    };
}

export default async function LessonReaderPage({ params }: LessonReaderPageProps) {
    const { lessonId } = await params;
    return <LessonReaderClient lessonId={lessonId} />;
}
