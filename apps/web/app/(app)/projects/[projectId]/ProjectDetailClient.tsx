"use client";

import { Download04Icon, Edit01Icon, RefreshIcon } from "hugeicons-react";
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
            <Card>
                <CardHeader>
                    <CardTitle>Loading project</CardTitle>
                    <CardDescription>Fetching latest generation status and section data.</CardDescription>
                </CardHeader>
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
            <Card className="border-0 bg-[linear-gradient(145deg,#fff7ed_0%,#f8fafc_45%,#ffffff_100%)]">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="text-2xl">{project.title}</CardTitle>
                            <CardDescription>
                                {project.templateName} • {project.subject} • {project.level.toUpperCase()}
                            </CardDescription>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                                Status: {project.status}
                            </p>
                        </div>
                        <Button variant="ghost" onClick={() => void loadProject()}>
                            <RefreshIcon size={14} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button onClick={() => void downloadPdf()} disabled={!canUsePdfActions || downloading}>
                        <Download04Icon size={16} />
                        <span className="ml-2">Download PDF</span>
                    </Button>

                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" onClick={openEditor} disabled={!canUsePdfActions}>
                                <Edit01Icon size={16} />
                                <span className="ml-2">Edit PDF</span>
                            </Button>
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
                        <Button variant="ghost">Go to projects</Button>
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sections</CardTitle>
                    <CardDescription>Current deterministic section order and content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {project.sections.map((section) => (
                        <SectionPreview key={section.key} section={section} />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function SectionPreview({ section }: { section: ProjectSection }) {
    return (
        <div className="rounded-2xl border border-border bg-background-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{section.title}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{section.body}</p>
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
