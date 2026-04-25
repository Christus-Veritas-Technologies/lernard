import type { Metadata } from "next";

import { QuizEntryClient } from "./QuizEntryClient";

export const metadata: Metadata = {
    title: "Quiz — Lernard",
};

export default function QuizEntryPage() {
    return <QuizEntryClient />;
}
