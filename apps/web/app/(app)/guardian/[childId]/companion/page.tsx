import type { Metadata } from "next";

import { ChildCompanionClient } from "./ChildCompanionClient";

interface ChildCompanionProps {
    params: Promise<{ childId: string }>;
}

export async function generateMetadata({ params }: ChildCompanionProps): Promise<Metadata> {
    const { childId } = await params;

    return {
        title: `Companion Controls ${childId} — Household — Lernard`,
        description: "Adjust live Companion controls for a linked learner without leaving the Household workflow.",
    };
}

export default async function ChildCompanionPage({ params }: ChildCompanionProps) {
    const { childId } = await params;

    return <ChildCompanionClient childId={childId} />;
}
