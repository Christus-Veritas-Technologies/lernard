import type { Metadata } from "next";

import { QuizDashboardClient } from "./QuizDashboardClient";

export const metadata: Metadata = {
    title: "Quiz Dashboard — Lernard",
    description: "Track quiz momentum, review history, and launch new practice.",
};

export default function QuizPage() {
    return <QuizDashboardClient />;
}
