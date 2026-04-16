interface ChildPageProps {
    params: Promise<{ childId: string }>;
}

export default async function ChildPage({ params }: ChildPageProps) {
    const { childId } = await params;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Child overview</h1>
            <p className="text-text-secondary">Child ID: {childId}</p>
        </div>
    );
}
