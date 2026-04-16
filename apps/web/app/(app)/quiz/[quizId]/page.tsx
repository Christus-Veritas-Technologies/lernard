interface QuizPageProps {
    params: Promise<{ quizId: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
    const { quizId } = await params;

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold text-text-primary">Quiz</h1>
            <p className="mt-2 text-text-secondary">Quiz ID: {quizId}</p>
        </div>
    );
}
