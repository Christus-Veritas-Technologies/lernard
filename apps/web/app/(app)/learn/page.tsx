import type { Metadata } from "next";

import { LearnPageClient } from "./LearnPageClient";

export const metadata: Metadata = {
    title: "Learn — Lernard",
    description: "Create a personalized lesson on any topic.",
};

export default function LearnPage() {
    return <LearnPageClient />;
}
