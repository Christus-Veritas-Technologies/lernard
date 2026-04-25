import type { Metadata } from "next";

import { QuizResultsClient } from "./QuizResultsClient";

interface QuizResultsProps {
    params: Promise<{ quizId: string }>;
}

export async function generateMetadata({ params }: QuizResultsProps): Promise<Metadata> {
    const { quizId } = await params;

    return {
        title: `Quiz Results ${quizId} — Lernard`,
        description: "Review a completed quiz and keep the next revision step close at hand.",
    };
}

export default async function QuizResultsPage({ params }: QuizResultsProps) {
    const { quizId } = await params;

    return <QuizResultsClient quizId={quizId} />;
}
