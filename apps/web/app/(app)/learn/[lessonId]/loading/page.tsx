import type { Metadata } from "next";

interface LessonLoadingPageProps {
    params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: LessonLoadingPageProps): Promise<Metadata> {
    const { lessonId } = await params;

    return {
        title: `Building Lesson ${lessonId} — Lernard`,
        description: "Lernard is preparing your lesson so you can jump straight into the next guided session.",
    };
}

export default function LessonLoadingPage() {
    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-400" />
            <p className="text-lg text-text-secondary">Building your lesson...</p>
        </div>
    );
}
