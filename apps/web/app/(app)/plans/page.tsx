import type { Metadata } from "next";

import { PlansPageClient } from "./PlansPageClient";

export const metadata: Metadata = {
    title: "Plans — Lernard",
    description: "Simple, transparent pricing for every learner.",
};

export default function PlansPage() {
    return <PlansPageClient />;
}
