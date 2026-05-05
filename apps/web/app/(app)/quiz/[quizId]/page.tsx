import { QuizScreenClient } from "./QuizScreenClient";

interface QuizScreenPageProps {
    params: Promise<{ quizId: string }>;
}

export default async function QuizScreenPage({ params }: QuizScreenPageProps) {
    const { quizId } = await params;
    return <QuizScreenClient quizId={quizId} />;
}
