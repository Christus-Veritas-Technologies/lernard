import { LessonLoadingClient } from "./LessonLoadingClient";

interface LessonLoadingPageProps {
    params: Promise<{ lessonId: string }>;
}

export default async function LessonLoadingPage({ params }: LessonLoadingPageProps) {
    const { lessonId } = await params;
    return <LessonLoadingClient lessonId={lessonId} />;
}
