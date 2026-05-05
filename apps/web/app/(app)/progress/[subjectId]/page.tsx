import type { Metadata } from "next";
import { SubjectDetailClient } from "./SubjectDetailClient";

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

    return <SubjectDetailClient subjectId={subjectId} />;
}
