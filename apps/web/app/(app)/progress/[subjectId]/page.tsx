import type { Metadata } from "next";

interface SubjectProgressProps {
    params: Promise<{ subjectId: string }>;
}

export async function generateMetadata({ params }: SubjectProgressProps): Promise<Metadata> {
    const { subjectId } = await params;

    return {
        title: `Subject Progress ${subjectId} — Lernard`,
        description: "Inspect subject-level progress, momentum, and growth areas for a single learning track.",
    };
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
