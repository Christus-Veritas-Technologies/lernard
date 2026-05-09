import type { Metadata } from "next";

import { QuizDashboardClient } from "./QuizDashboardClient";

export const metadata: Metadata = {
    title: "Practice Exams Dashboard — Lernard",
    description: "Track practice exam momentum, review history, and launch new practice.",
};

export default function QuizPage() {
    return <QuizDashboardClient />;
}
