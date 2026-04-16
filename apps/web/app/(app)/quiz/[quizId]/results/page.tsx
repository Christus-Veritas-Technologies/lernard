interface QuizResultsProps {
    params: Promise<{ quizId: string }>;
}

export default async function QuizResultsPage({ params }: QuizResultsProps) {
    const { quizId } = await params;

    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-text-primary">Quiz results</h1>
            <p className="text-text-secondary">Quiz ID: {quizId}</p>
        </div>
    );
}
