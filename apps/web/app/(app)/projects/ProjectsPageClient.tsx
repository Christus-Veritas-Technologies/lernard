"use client";

import { useEffect, useState } from "react";
import { FolderLibraryIcon, RefreshIcon } from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { ProjectLevel, ProjectTemplateDefinition, ProjectsContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

export function ProjectsPageClient() {
    const [templates, setTemplates] = useState<ProjectTemplateDefinition[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [templatesError, setTemplatesError] = useState<string | null>(null);

    async function loadTemplates() {
        setTemplatesLoading(true);
        setTemplatesError(null);

        try {
            const response = await browserApiFetch<ProjectTemplateDefinition[]>(ROUTES.PROJECTS.TEMPLATES);
            setTemplates(response);
        } catch {
            setTemplatesError("Templates could not load right now. Try again in a moment.");
        } finally {
            setTemplatesLoading(false);
        }
    }

    useEffect(() => {
        void loadTemplates();
    }, []);

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
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Badge tone="primary">Project templates</Badge>
                            <CardTitle className="mt-2">Choose from 10 structured templates</CardTitle>
                            <CardDescription>
                                Each template includes guided sections, clear mark targets, and level-appropriate structure.
                            </CardDescription>
                        </div>
                        <Button onClick={() => void loadTemplates()} variant="secondary">Refresh templates</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {templatesLoading ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                    className="h-52 animate-pulse rounded-2xl border border-border bg-background-subtle"
                                    key={`template-loading-${index}`}
                                />
                            ))}
                        </div>
                    ) : null}

                    {!templatesLoading && templatesError ? (
                        <div className="rounded-2xl border border-dashed border-warning/40 bg-warning-bg p-5 text-sm text-text-primary">
                            <p>{templatesError}</p>
                            <Button className="mt-3" onClick={() => void loadTemplates()} variant="secondary">Try again</Button>
                        </div>
                    ) : null}

                    {!templatesLoading && !templatesError && templates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-background-subtle p-6 text-sm text-text-secondary">
                            No templates are available yet.
                        </div>
                    ) : null}

                    {!templatesLoading && !templatesError && templates.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {templates.map((template) => {
                                const stepPreview = template.steps.slice(0, 4);
                                const remainingCount = Math.max(template.steps.length - stepPreview.length, 0);

                                return (
                                    <article
                                        className="rounded-2xl border border-border bg-white p-4 shadow-[0_18px_40px_-34px_rgba(36,52,88,0.45)]"
                                        key={template.id}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone={levelTone(template.level)}>{formatLevel(template.level)}</Badge>
                                            <Badge tone="cool">{template.subject}</Badge>
                                            <Badge tone="warm">{template.totalMarks} marks</Badge>
                                        </div>
                                        <h3 className="mt-3 text-base font-semibold text-text-primary">{template.name}</h3>
                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-secondary">{template.description}</p>

                                        <div className="mt-4 rounded-xl border border-border bg-background-subtle p-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">Section flow</p>
                                            <ul className="mt-2 space-y-1.5">
                                                {stepPreview.map((step) => (
                                                    <li className="text-sm text-text-primary" key={step.key}>• {step.title}</li>
                                                ))}
                                            </ul>
                                            {remainingCount > 0 ? (
                                                <p className="mt-2 text-xs font-medium text-text-secondary">+{remainingCount} more sections</p>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
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

function formatLevel(level: ProjectLevel): string {
    if (level === "grade7") return "Grade 7";
    if (level === "olevel") return "O Level";
    return "A Level";
}

function levelTone(level: ProjectLevel): "cool" | "warm" | "primary" {
    if (level === "grade7") return "cool";
    if (level === "olevel") return "warm";
    return "primary";
}
