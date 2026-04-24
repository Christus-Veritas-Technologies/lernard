import type { Metadata } from "next";

import { ChildPageClient } from "./ChildPageClient";

interface ChildPageProps {
    params: Promise<{ childId: string }>;
}

export async function generateMetadata({ params }: ChildPageProps): Promise<Metadata> {
    const { childId } = await params;

    return {
        title: `Learner ${childId} — Household — Lernard`,
        description: "Review a learner's live progress, recent sessions, and subject insights from the Household dashboard.",
    };
}

export default async function ChildPage({ params }: ChildPageProps) {
    const { childId } = await params;

    return <ChildPageClient childId={childId} />;
}
