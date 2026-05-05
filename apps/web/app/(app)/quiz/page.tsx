import type { Metadata } from "next";

import { QuizEntryClient } from "./QuizEntryClient";

export const metadata: Metadata = {
    title: "Quiz — Lernard",
    description: "Generate a quiz and test your understanding.",
};

export default function QuizPage() {
    return <QuizEntryClient />;
}
