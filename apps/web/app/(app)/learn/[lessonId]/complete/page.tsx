interface LessonCompleteProps {
    params: Promise<{ lessonId: string }>;
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
