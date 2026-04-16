import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Quiz — Lernard",
};

export default function QuizEntryPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Quiz</h1>
            <p className="text-text-secondary">Ready to test what you know?</p>
        </div>
    );
}
