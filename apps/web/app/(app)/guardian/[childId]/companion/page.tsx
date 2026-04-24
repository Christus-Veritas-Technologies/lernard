interface ChildCompanionProps {
    params: Promise<{ childId: string }>;
}

import { ChildCompanionClient } from "./ChildCompanionClient";

export default async function ChildCompanionPage({ params }: ChildCompanionProps) {
    const { childId } = await params;

    return <ChildCompanionClient childId={childId} />;
}
