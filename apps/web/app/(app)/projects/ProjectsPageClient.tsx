"use client";

import { FolderLibraryIcon, RefreshIcon } from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { ProjectsContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePagePayload } from "@/hooks/usePagePayload";

export function ProjectsPageClient() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ProjectsContent>(
        ROUTES.PROJECTS.PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in to continue</CardTitle>
                    <CardDescription>Projects are linked to your Lernard account.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading projects</CardTitle>
                    <CardDescription>Fetching your latest generated coursework.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Projects could not load</CardTitle>
                    <CardDescription>{error?.message ?? "Something went wrong while loading projects."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="secondary" onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content } = data;

    return (
        <div className="space-y-6">
            <Card className="border-0 bg-[linear-gradient(145deg,#ecfeff_0%,#f8fafc_45%,#ffffff_100%)]">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <Badge tone="cool">Projects</Badge>
                            <CardTitle className="mt-3 text-2xl">Generated project workspace</CardTitle>
                            <CardDescription>
                                Track project generation, edit finished PDFs, and export clean submissions.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" onClick={refetch}>
                            <RefreshIcon size={14} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Total" value={content.totalProjects} />
                    <Stat label="Ready" value={content.readyProjects} />
                    <Stat label="Generating" value={content.generatingProjects} />
                    <Stat label="Drafts" value={content.draftsInProgress} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent projects</CardTitle>
                    <CardDescription>Open any project to download or edit its PDF output.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {content.recentProjects.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-background-subtle p-6 text-sm text-text-secondary">
                            No projects yet. Generate one from the API flow, then manage it here.
                        </div>
                    ) : (
                        content.recentProjects.map((project) => (
                            <Link
                                href={`/projects/${project.projectId}`}
                                key={project.projectId}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 hover:bg-white"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-text-primary">{project.title}</p>
                                    <p className="text-xs text-text-secondary">
                                        {project.templateName} • {project.subject} • {project.level.toUpperCase()}
                                    </p>
                                </div>
                                <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                                    {project.status}
                                </span>
                            </Link>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Drafts in progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background-subtle px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Active drafts</p>
                            <p className="text-xs text-text-secondary">{content.drafts.length} draft(s) currently saved.</p>
                        </div>
                        <FolderLibraryIcon size={20} className="text-primary-500" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{value}</p>
        </div>
    );
}
