interface ChildCompanionProps {
    params: Promise<{ childId: string }>;
}

import { getChildProfileContent } from "../../../../../lib/page-mock-data";

import { ChildCompanionClient } from "./ChildCompanionClient";

export default async function ChildCompanionPage({ params }: ChildCompanionProps) {
    const { childId } = await params;
    const profile = getChildProfileContent(childId);

    return <ChildCompanionClient childId={childId} childName={profile.child.name} />;
}
