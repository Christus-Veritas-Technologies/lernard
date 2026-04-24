import type { Metadata } from "next";

interface QuizPageProps {
    params: Promise<{ quizId: string }>;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
    const { quizId } = await params;

    return {
        title: `Quiz ${quizId} — Lernard`,
        description: "Open a live quiz, answer questions, and measure understanding without losing context.",
    };
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
