import type { Metadata } from "next";

import { FeaturePlaceholderPage } from "../../../components/dashboard/FeaturePlaceholderPage";

export const metadata: Metadata = {
    title: "Quiz — Lernard",
};

export default function QuizEntryPage() {
    return (
        <FeaturePlaceholderPage
            badge="Practice"
            description="Quizzes will soon launch from here as a first-class flow instead of feeling tucked behind lesson generation."
            eyebrow="Quiz"
            items={[
                {
                    title: "Quick checks",
                    description: "Start a targeted quiz fast",
                    detail: "The quiz generator endpoint already exists, but this shell entry page still needs the final orchestration work.",
                    tone: "primary",
                },
                {
                    title: "Results loop",
                    description: "Review and retry from one place",
                    detail: "The nested quiz routes are present, so this page is now designed to hand into them cleanly when the live entry flow is wired.",
                    tone: "cool",
                },
                {
                    title: "Right now",
                    description: "Start from Learn",
                    detail: "The live Learn page already gives you the best current route into lesson and practice generation.",
                    tone: "warm",
                },
            ]}
            noteDescription="This page now matches the shell visually without pretending the final quiz-launch flow is already complete."
            noteTitle="Shell-ready"
            title="Ready to test what you know, once the launch flow lands"
        />
    );
}
