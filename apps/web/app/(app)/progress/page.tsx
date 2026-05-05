import type { Metadata } from "next";

import { ProgressPageClient } from "./ProgressPageClient";

export const metadata: Metadata = {
    title: "Progress — Lernard",
    description: "Track your strengths, history, and growth areas.",
};

export default function ProgressPage() {
    return <ProgressPageClient />;
}
