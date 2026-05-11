"use client";

import {
    ArrowRight01Icon,
    BookOpen01Icon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    Download04Icon,
    Edit01Icon,
    RefreshIcon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

import { ROUTES } from "@lernard/routes";
import type { ProjectContent, ProjectSection } from "@lernard/shared-types";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

import type { ReactNode } from "react";

interface ProjectDetailClientProps {
    projectId: string;
}

interface ProjectDownloadResponse {
    fileName: string;
    downloadUrl: string;
}

interface EditableSection {
    key: string;
    title: string;
    body: string;
}

export function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
    const [project, setProject] = useState<ProjectContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editSections, setEditSections] = useState<EditableSection[]>([]);

    const loadProject = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const detail = await browserApiFetch<ProjectContent>(ROUTES.PROJECTS.GET(projectId));
            setProject(detail);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load this project.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!project) {
            return;
        }

        if (project.status !== "queued" && project.status !== "processing") {
            return;
        }

        const interval = window.setInterval(() => {
            void loadProject();
        }, 4000);

        return () => {
            window.clearInterval(interval);
        };
    }, [loadProject, project]);

    const canUsePdfActions = useMemo(
        () => Boolean(project && project.status === "ready" && project.pdfReadyAt),
        [project],
    );

    function openEditor() {
        if (!project) {
            return;
        }

        setEditTitle(project.title);
        setEditSections(project.sections.map((section) => ({ ...section })));
        setIsEditOpen(true);
    }

    function updateSection(index: number, key: "title" | "body", value: string) {
        setEditSections((current) =>
            current.map((section, currentIndex) =>
                currentIndex === index ? { ...section, [key]: value } : section,
            ),
        );
    }

    async function downloadPdf() {
        if (!project) {
            return;
        }

        setDownloading(true);
        try {
            const download = await browserApiFetch<ProjectDownloadResponse>(ROUTES.PROJECTS.DOWNLOAD_PDF(project.projectId));
            window.open(download.downloadUrl, "_blank", "noopener,noreferrer");
            toast.success("Download started.");
        } catch (downloadError) {
            toast.error(downloadError instanceof Error ? downloadError.message : "Could not download PDF.");
        } finally {
            setDownloading(false);
        }
    }

    async function saveEditedPdf() {
        if (!project) {
            return;
        }

        setSavingEdit(true);
        try {
            const nextProject = await browserApiFetch<ProjectContent>(ROUTES.PROJECTS.EDIT_PDF(project.projectId), {
                method: "PATCH",
                body: JSON.stringify({
                    title: editTitle,
                    sections: editSections,
                }),
            });

            setProject(nextProject);
            setIsEditOpen(false);
            toast.success("PDF updated successfully.");
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "Could not update PDF.");
        } finally {
            setSavingEdit(false);
        }
    }

    async function downloadEditedPreview() {
        if (!project) {
            return;
        }

        try {
            const download = await browserApiFetch<ProjectDownloadResponse>(ROUTES.PROJECTS.DOWNLOAD_PDF(project.projectId));
            const response = await fetch(download.downloadUrl, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Could not load source PDF for preview.");
            }

            const sourceBytes = await response.arrayBuffer();
            const document = await PDFDocument.load(sourceBytes);
            document.setTitle(editTitle.trim().length > 0 ? editTitle.trim() : project.title);
            document.setProducer("Lernard Web PDF Editor");
            document.setCreator("Lernard Projects Web");

            const editedBytes = await document.save();
            const editedBuffer = editedBytes.buffer.slice(
                editedBytes.byteOffset,
                editedBytes.byteOffset + editedBytes.byteLength,
            );
            const blob = new Blob([editedBuffer], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement("a");
            anchor.href = url;
            anchor.download = `${(editTitle || project.title).trim().replace(/\s+/g, "-").toLowerCase()}-preview.pdf`;
            anchor.click();
            URL.revokeObjectURL(url);
            toast.success("Preview PDF downloaded.");
        } catch (previewError) {
            toast.error(previewError instanceof Error ? previewError.message : "Could not create preview PDF.");
        }
    }

    if (loading) {
        return (
            <Card className="border-0 bg-gradient-to-br from-amber-50 via-white to-slate-50">
                <CardHeader className="space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <SparklesIcon size={18} />
                    </div>
                    <div className="h-7 w-56 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                    <SkeletonTile />
                    <SkeletonTile />
                    <SkeletonTile />
                </CardContent>
            </Card>
        );
    }

    if (error || !project) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Project unavailable</CardTitle>
                    <CardDescription>{error ?? "Could not load this project."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => void loadProject()} variant="secondary">Try again</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#fff7ed_0%,#fff_48%,#f8fafc_100%)] shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)]">
                <CardHeader className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 shadow-sm">
                                <SparklesIcon size={12} />
                                Project detail
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl tracking-tight text-text-primary">{project.title}</CardTitle>
                                <CardDescription className="max-w-2xl text-base text-text-secondary">
                                    {project.templateName} for {project.subject} at {project.level.toUpperCase()} level.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <MetaPill icon={<BookOpen01Icon size={12} />} label={project.subject} />
                                <MetaPill icon={<Clock01Icon size={12} />} label={project.level.toUpperCase()} />
                                <MetaPill icon={<CheckmarkCircle02Icon size={12} />} label={project.status} />
                            </div>
                        </div>

                        <Button variant="ghost" onClick={() => void loadProject()} className="rounded-full">
                            <RefreshIcon size={14} />
                            <span className="ml-2">Refresh</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                    <ActionTile
                        accent="amber"
                        icon={<Download04Icon size={16} />}
                        title="Download PDF"
                        description="Pull the latest generated file for offline use."
                        action={
                            <Button onClick={() => void downloadPdf()} disabled={!canUsePdfActions || downloading} className="w-full">
                                Download PDF
                            </Button>
                        }
                    />

                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <ActionTile
                                accent="slate"
                                icon={<Edit01Icon size={16} />}
                                title="Edit PDF"
                                description="Adjust the title and section text before regenerating."
                                action={
                                    <Button variant="secondary" onClick={openEditor} disabled={!canUsePdfActions} className="w-full">
                                        Edit PDF
                                    </Button>
                                }
                            />
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Edit PDF content</DialogTitle>
                                <DialogDescription>
                                    Update title and section text, then regenerate the deterministic PDF.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-primary" htmlFor="project-title">Project title</label>
                                    <Input id="project-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={200} />
                                </div>

                                {editSections.map((section, index) => (
                                    <SectionEditor
                                        key={section.key}
                                        section={section}
                                        onBodyChange={(value) => updateSection(index, "body", value)}
                                        onTitleChange={(value) => updateSection(index, "title", value)}
                                    />
                                ))}
                            </div>

                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button variant="ghost" onClick={() => void downloadEditedPreview()}>
                                    Download preview PDF
                                </Button>
                                <Button onClick={() => void saveEditedPdf()} disabled={savingEdit}>
                                    {savingEdit ? "Saving..." : "Save PDF edits"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Link href="/projects">
                        <Button variant="ghost" className="w-full justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-6 text-left text-text-primary shadow-sm hover:bg-white">
                            <span>
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Flow</span>
                                Back to projects
                            </span>
                            <ArrowRight01Icon size={16} />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Sections</CardTitle>
                        <CardDescription>Current deterministic section order and content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {project.sections.map((section, index) => (
                            <SectionPreview key={section.key} index={index} section={section} />
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-amber-100 bg-amber-50/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <SparklesIcon size={18} />
                            Generation notes
                        </CardTitle>
                        <CardDescription>This card keeps the key project facts visible while the PDF updates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-text-secondary">
                        <InfoRow label="Template" value={project.templateName} />
                        <InfoRow label="Subject" value={project.subject} />
                        <InfoRow label="Level" value={project.level.toUpperCase()} />
                        <InfoRow label="Status" value={project.status} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1 text-sm font-semibold text-text-secondary shadow-sm">
            <span className="text-amber-600">{icon}</span>
            {label}
        </div>
    );
}

function ActionTile({
    accent,
    icon,
    title,
    description,
    action,
}: {
    accent: "amber" | "slate";
    icon: ReactNode;
    title: string;
    description: string;
    action: ReactNode;
}) {
    const accentStyles = accent === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

    return (
        <div className={`flex h-full flex-col justify-between rounded-3xl border p-4 shadow-sm ${accentStyles}`}>
            <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                    {icon}
                </div>
                <div>
                    <p className="text-base font-semibold text-text-primary">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
                </div>
            </div>
            <div className="mt-4">{action}</div>
        </div>
    );
}

function SectionPreview({ section, index }: { section: ProjectSection; index: number }) {
    return (
        <div className="rounded-2xl border border-border bg-background-subtle p-4 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">Section {index + 1}</p>
                    <p className="mt-1 text-base font-semibold text-text-primary">{section.title}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary shadow-sm">
                    Ready
                </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{section.body}</p>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</span>
            <span className="font-semibold text-text-primary">{value}</span>
        </div>
    );
}
function SectionEditor({
    section,
    onTitleChange,
    onBodyChange,
}: {
    section: EditableSection;
    onTitleChange: (value: string) => void;
    onBodyChange: (value: string) => void;
}) {
    return (
        <div className="rounded-2xl border border-border bg-background-subtle p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{section.key}</p>
            <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Section title</label>
                <Input value={section.title} onChange={(event) => onTitleChange(event.target.value)} maxLength={140} />
            </div>
            <div className="mt-3 space-y-2">
                <label className="text-sm font-semibold text-text-primary">Section body</label>
                <Textarea value={section.body} onChange={(event) => onBodyChange(event.target.value)} maxLength={4000} className="min-h-36" />
            </div>
        </div>
    );
}

function SkeletonTile() {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-4 h-4 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
        </div>
    );
}
