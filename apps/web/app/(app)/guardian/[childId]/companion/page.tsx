interface ChildCompanionProps {
    params: Promise<{ childId: string }>;
}

export default async function ChildCompanionPage({ params }: ChildCompanionProps) {
    const { childId } = await params;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">
                Companion controls
            </h1>
            <p className="text-text-secondary">
                Manage companion settings for child: {childId}
            </p>
        </div>
    );
}
