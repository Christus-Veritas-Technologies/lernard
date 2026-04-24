import { ChildPageClient } from "./ChildPageClient";

interface ChildPageProps {
    params: Promise<{ childId: string }>;
}

export default async function ChildPage({ params }: ChildPageProps) {
    const { childId } = await params;

    return <ChildPageClient childId={childId} />;
}
