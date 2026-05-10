import { QuizResultsClient } from "./QuizResultsClient";

interface QuizResultsPageProps {
    params: Promise<{ quizId: string }>;
}

export default async function QuizResultsPage({ params }: QuizResultsPageProps) {
    const { quizId } = await params;
    return <QuizResultsClient quizId={quizId} />;
}
