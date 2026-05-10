import type { Metadata } from "next";

import { ProjectsPageClient } from "./ProjectsPageClient";

export const metadata: Metadata = {
    title: "Projects — Lernard",
    description: "Manage generated projects, edit sections, and download polished PDFs.",
};

export default function ProjectsPage() {
    return <ProjectsPageClient />;
}
