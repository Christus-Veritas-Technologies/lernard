import type { Metadata } from "next";

interface QuizLoadingPageProps {
    params: Promise<{ quizId: string }>;
}

export async function generateMetadata({ params }: QuizLoadingPageProps): Promise<Metadata> {
    const { quizId } = await params;

    return {
        title: `Preparing Quiz ${quizId} — Lernard`,
        description: "Lernard is preparing your next quiz so you can move straight into practice.",
    };
}

export default function QuizLoadingPage() {
    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-400" />
            <p className="text-lg text-text-secondary">Preparing your quiz...</p>
        </div>
    );
}
