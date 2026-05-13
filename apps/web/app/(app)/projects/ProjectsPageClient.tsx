"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight01Icon, BookOpen01Icon, CheckmarkCircle02Icon, Clock01Icon, FireIcon, FolderLibraryIcon, RefreshIcon, SparklesIcon } from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { PagePayload, PlanUsage, ProgressContent, ProjectLevel, ProjectTemplateDefinition, ProjectsContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

export function ProjectsPageClient() {
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
    const [templates, setTemplates] = useState<ProjectTemplateDefinition[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [templatesError, setTemplatesError] = useState<string | null>(null);
    const [activeLevel, setActiveLevel] = useState<ProjectLevel | "all">("all");

    useEffect(() => {
        setTemplatesLoading(true);
        void browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((d) => setPlanUsage(d.content.planUsage))
            .catch(() => undefined);

        void browserApiFetch<ProjectTemplateDefinition[]>(ROUTES.PROJECTS.TEMPLATES)
            .then((result) => {
                setTemplates(result);
                setTemplatesError(null);
            })
            .catch(() => setTemplatesError("Templates could not load right now."))
            .finally(() => setTemplatesLoading(false));
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
                <CardContent>
                    <Link href="/auth/login">
                        <Button>
                            Go to sign in
                            <ArrowRight01Icon className="ml-2 size-4" />
                        </Button>
                    </Link>
                </CardContent>
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
    const isProjectsExhausted = planUsage !== null && planUsage.projectsLimit > 0 && planUsage.projectsUsed >= planUsage.projectsLimit;
    const visibleTemplates = activeLevel === "all"
        ? templates
        : templates.filter((template) => template.level === activeLevel);

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(145deg,#ecfeff_0%,#f8fafc_45%,#ffffff_100%)]">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <Badge tone="cool" className="gap-1.5">
                                <SparklesIcon size={12} />
                                Projects
                            </Badge>
                            <div className="mt-4 flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-sm shadow-primary-500/20">
                                    <FolderLibraryIcon size={22} />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl">Generated project workspace</CardTitle>
                                    <CardDescription className="mt-2 max-w-xl">
                                        Track project generation, inspect the section flow, and export polished PDFs without leaving the page.
                                    </CardDescription>
                                </div>
                            </div>
                        </div>

                        <Button variant="ghost" onClick={refetch}>
                            <RefreshIcon size={14} />
                            <span className="ml-2">Refresh</span>
                        </Button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        <MetaPill icon={<CheckmarkCircle02Icon size={12} className="text-success" />} label={`${content.readyProjects} ready`} />
                        <MetaPill icon={<Clock01Icon size={12} className="text-primary-500" />} label={`${content.generatingProjects} generating`} />
                        <MetaPill icon={<FireIcon size={12} className="text-warning" />} label={`${content.draftsInProgress} drafts in progress`} />
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat icon={<FolderLibraryIcon size={16} />} label="Total" value={content.totalProjects} tone="cool" />
                    <Stat icon={<CheckmarkCircle02Icon size={16} />} label="Ready" value={content.readyProjects} tone="success" />
                    <Stat icon={<Clock01Icon size={16} />} label="Generating" value={content.generatingProjects} tone="primary" />
                    <Stat icon={<FireIcon size={16} />} label="Drafts" value={content.draftsInProgress} tone="warm" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Start a new project</CardTitle>
                    <CardDescription>
                        Enter your details and let Lernard generate a complete ZIMSEC project document for your level.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {planUsage && planUsage.projectsLimit > 0 && (
                        <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                            <div className="flex items-center justify-between text-xs text-text-secondary">
                                <span>Projects this month</span>
                                <span>{planUsage.projectsUsed} / {planUsage.projectsLimit}</span>
                            </div>
                            <Progress
                                value={Math.min((planUsage.projectsUsed / planUsage.projectsLimit) * 100, 100)}
                                className="h-1.5"
                            />
                        </div>
                    )}
                    {isProjectsExhausted ? (
                        <Link href="/plans">
                            <Button size="lg" variant="secondary" disabled>
                                <SparklesIcon size={18} />
                                <span className="ml-2">Project limit reached â€” upgrade to create more</span>
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/projects/create">
                            <Button size="lg">
                                <SparklesIcon size={18} />
                                <span className="ml-2">New project</span>
                            </Button>
                        </Link>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Project templates</CardTitle>
                    <CardDescription>
                        Pick a template to prefill the structure, or skip templates and let Lernard design the document flow.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {([
                            { value: "all", label: "All levels" },
                            { value: "grade7", label: "Grade 7" },
                            { value: "olevel", label: "O Level" },
                            { value: "alevel", label: "A Level" },
                        ] as const).map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setActiveLevel(tab.value)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                                    activeLevel === tab.value
                                        ? "border-primary-300 bg-primary-100 text-primary-700"
                                        : "border-border bg-white text-text-secondary"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {templatesLoading ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div className="h-44 animate-pulse rounded-2xl border border-border bg-background-subtle" key={`template-skeleton-${index}`} />
                            ))}
                        </div>
                    ) : null}

                    {!templatesLoading && templatesError ? (
                        <div className="rounded-2xl border border-warning/50 bg-warning-bg px-4 py-3 text-sm text-warning">
                            {templatesError}
                        </div>
                    ) : null}

                    {!templatesLoading && !templatesError && visibleTemplates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-background-subtle p-4 text-sm text-text-secondary">
                            No templates for this level yet.
                        </div>
                    ) : null}

                    {!templatesLoading && !templatesError && visibleTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {visibleTemplates.map((template) => (
                                <Link
                                    href={`/projects/create?template=${encodeURIComponent(template.id)}`}
                                    key={template.id}
                                    className="rounded-2xl border border-border bg-white p-4 transition hover:border-primary-200 hover:shadow-sm"
                                >
                                    <p className="text-sm font-semibold text-text-primary">{template.name}</p>
                                    <p className="mt-1 text-xs text-text-secondary">{formatTemplateLevel(template.level)} • {template.steps.length} sections</p>
                                    <p className="mt-2 text-sm leading-6 text-text-secondary">{template.description}</p>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {template.labels.slice(0, 3).map((label) => (
                                            <span
                                                className="rounded-full bg-background-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary"
                                                key={`${template.id}-${label}`}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </Link>
                            ))}
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
                                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-subtle px-4 py-3 transition hover:border-primary-200 hover:bg-white"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border">
                                        <BookOpen01Icon size={16} className="text-primary-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-text-primary">{project.title}</p>
                                        <p className="text-xs text-text-secondary">
                                            {project.templateName} â€¢ {project.subject} â€¢ {project.level.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={projectStatusTone(project.status)}>{project.status}</span>
                                    <ArrowRight01Icon size={14} className="text-text-tertiary" />
                                </div>
                            </Link>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle>Drafts in progress</CardTitle>
                        <Badge tone="muted">Live draft data</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background-subtle px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary">Active drafts</p>
                            <p className="text-xs text-text-secondary">{content.drafts.length} draft(s) currently saved.</p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border">
                            <FolderLibraryIcon size={20} className="text-primary-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: "cool" | "warm" | "success" | "primary" }) {
    return (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-[0_18px_40px_-34px_rgba(36,52,88,0.45)]">
            <div className="flex items-center gap-2.5">
                <span className={statIconTone[tone]}>{icon}</span>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-text-primary">{value}</p>
        </div>
    );
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] text-text-primary shadow-sm ring-1 ring-border">
            {icon}
            {label}
        </span>
    );
}

function projectStatusTone(status: string): string {
    if (status === "ready") {
        return "inline-flex items-center rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-success";
    }

    if (status === "processing" || status === "queued") {
        return "inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700";
    }

    return "inline-flex items-center rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-warning";
}

const statIconTone = {
    cool: "flex h-8 w-8 items-center justify-center rounded-xl bg-accent-cool-100 text-text-primary",
    warm: "flex h-8 w-8 items-center justify-center rounded-xl bg-accent-warm-100 text-text-primary",
    success: "flex h-8 w-8 items-center justify-center rounded-xl bg-success-bg text-success",
    primary: "flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-700",
} as const;

function formatTemplateLevel(level: ProjectLevel): string {
    if (level === "grade7") {
        return "Grade 7";
    }
    if (level === "olevel") {
        return "O Level";
    }
    return "A Level";
}
