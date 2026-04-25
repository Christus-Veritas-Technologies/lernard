import type { Metadata } from "next";

import { QuizPageClient } from "./QuizPageClient";

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

    return <QuizPageClient quizId={quizId} />;
}
