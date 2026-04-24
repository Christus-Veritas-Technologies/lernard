import type { Metadata } from "next";

import { LearnPageClient } from "./LearnPageClient";

export const metadata: Metadata = {
    title: "Learn — Lernard",
    description: "Build a lesson, revisit growth areas, and keep unfinished work moving.",
};

export default function LearnPage() {
    return <LearnPageClient />;
}
