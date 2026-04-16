interface LessonPageProps {
    params: Promise<{ lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
    const { lessonId } = await params;

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold text-text-primary">Lesson</h1>
            <p className="mt-2 text-text-secondary">Lesson ID: {lessonId}</p>
        </div>
    );
}
