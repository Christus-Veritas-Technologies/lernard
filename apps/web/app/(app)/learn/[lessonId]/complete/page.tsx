import type { Metadata } from "next";

interface LessonCompleteProps {
    params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: LessonCompleteProps): Promise<Metadata> {
    const { lessonId } = await params;

    return {
        title: `Lesson Complete ${lessonId} — Lernard`,
        description: "See the completion state for a finished lesson and stay ready for the next guided step.",
    };
}

export default async function LessonCompletePage({ params }: LessonCompleteProps) {
    const { lessonId } = await params;

    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-text-primary">Lesson complete!</h1>
            <p className="text-text-secondary">Lesson ID: {lessonId}</p>
        </div>
    );
}
