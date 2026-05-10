import type { Metadata } from "next";

import { ProjectDetailClient } from "./ProjectDetailClient";

interface ProjectDetailPageProps {
    params: Promise<{ projectId: string }>;
}

export const metadata: Metadata = {
    title: "Project Detail — Lernard",
    description: "Download and edit deterministic project PDFs.",
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const { projectId } = await params;
    return <ProjectDetailClient projectId={projectId} />;
}
