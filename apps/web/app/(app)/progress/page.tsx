import type { Metadata } from "next";

import { FeaturePlaceholderPage } from "../../../components/dashboard/FeaturePlaceholderPage";

export const metadata: Metadata = {
    title: "Progress — Lernard",
};

export default function ProgressPage() {
    return (
        <FeaturePlaceholderPage
            badge="Read on You"
            description="This is where your cross-subject progress story will live once the progress service is implemented."
            eyebrow="Progress"
            items={[
                {
                    title: "Subject trends",
                    description: "Compare strengths and growth areas",
                    detail: "The planned subject and history endpoints are present, but the current service still returns not implemented.",
                    tone: "primary",
                },
                {
                    title: "Session history",
                    description: "Follow your rhythm over time",
                    detail: "The shell now makes room for this view so it won’t feel bolted on when the real data arrives.",
                    tone: "cool",
                },
                {
                    title: "Right now",
                    description: "Use Home and Guardian snapshots",
                    detail: "Live Home and Guardian pages already surface the most important recent signals while the full progress layer lands.",
                    tone: "warm",
                },
            ]}
            noteDescription="The API routes exist, but every progress service method is still stubbed with NotImplementedException."
            noteTitle="Not yet live"
            title="Lernard&apos;s Read on You is getting its full home"
        />
    );
}
