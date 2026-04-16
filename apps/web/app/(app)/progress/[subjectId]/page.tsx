interface SubjectProgressProps {
    params: Promise<{ subjectId: string }>;
}

export default async function SubjectProgressPage({ params }: SubjectProgressProps) {
    const { subjectId } = await params;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Subject progress</h1>
            <p className="text-text-secondary">Subject ID: {subjectId}</p>
        </div>
    );
}
