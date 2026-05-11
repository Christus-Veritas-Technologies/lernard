"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft01Icon,
    CheckmarkCircle02Icon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { ProjectLevel, ProjectTemplateDefinition } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

type CreateStep = "template" | "details" | "generating";

function levelLabel(level: ProjectLevel): string {
    if (level === "grade7") return "Grade 7";
    if (level === "olevel") return "O Level";
    return "A Level";
}

function levelTone(level: ProjectLevel): "cool" | "warm" | "primary" {
    if (level === "grade7") return "cool";
    if (level === "olevel") return "warm";
    return "primary";
}

function levelAccent(level: ProjectLevel): string {
    if (level === "grade7") return "bg-sky-500";
    if (level === "olevel") return "bg-amber-500";
    return "bg-indigo-500";
}

/** Generates a v4 UUID using the Web Crypto API */
function generateUUID(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
    return (
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-primary-600" : done ? "text-success" : "text-text-tertiary"}`}>
            <span className={`h-2 w-2 rounded-full ${active ? "bg-primary-500" : done ? "bg-success" : "bg-border"}`} />
            {label}
        </span>
    );
}

export function ProjectCreateClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateParam = searchParams?.get("template") ?? null;

    // If a template was pre-selected via URL, go straight to the details step
    const [step, setStep] = useState<CreateStep>(templateParam ? "details" : "template");
    const [templates, setTemplates] = useState<ProjectTemplateDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateParam);

    const [fullName, setFullName] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [candidateNumber, setCandidateNumber] = useState("");
    const [className, setClassName] = useState("");
    const [community, setCommunity] = useState("");
    const [problemStatement, setProblemStatement] = useState("");
    const [availableResources, setAvailableResources] = useState("");
    const [topicHint, setTopicHint] = useState("");

    useEffect(() => {
        void (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const response = await browserApiFetch<ProjectTemplateDefinition[]>(ROUTES.PROJECTS.TEMPLATES);
                setTemplates(response);
                // If the pre-selected template id doesn't actually exist, fall back to picker
                if (templateParam && !response.find((t) => t.id === templateParam)) {
                    setSelectedTemplateId(null);
                    setStep("template");
                }
            } catch {
                setLoadError("Could not load templates. Please try again.");
            } finally {
                setLoading(false);
            }
        })();
    }, [templateParam]);

    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

    const detailsValid =
        fullName.trim().length > 0 &&
        schoolName.trim().length > 0 &&
        candidateNumber.trim().length > 0 &&
        className.trim().length > 0 &&
        community.trim().length > 0 &&
        problemStatement.trim().length > 0 &&
        availableResources.trim().length > 0;

    async function handleSubmit() {
        if (!selectedTemplate || !detailsValid) return;
        setFormError(null);
        setSubmitting(true);
        setStep("generating");

        try {
            const draft = await browserApiFetch<{ draftId: string }>(ROUTES.PROJECTS.CREATE_DRAFT, {
                method: "POST",
                body: JSON.stringify({
                    templateId: selectedTemplate.id,
                    subject: selectedTemplate.subject,
                    level: selectedTemplate.level,
                    topicHint: topicHint.trim() || undefined,
                    studentInfo: { fullName, schoolName, candidateNumber, className },
                    context: { community, problemStatement, availableResources },
                }),
            });

            const result = await browserApiFetch<{ projectId: string }>(ROUTES.PROJECTS.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    draftId: draft.draftId,
                    idempotencyKey: generateUUID(),
                }),
            });

            router.push(`/projects/${result.projectId}`);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Could not create project. Please try again.");
            setSubmitting(false);
            setStep("details");
        }
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <Card className="border-0 bg-gradient-to-br from-slate-50 to-white">
                <CardHeader className="space-y-4">
                    <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-5 w-64 animate-pulse rounded-full bg-slate-100" />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-36 animate-pulse rounded-3xl border border-border bg-slate-100" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (loadError || templates.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load templates</CardTitle>
                    <CardDescription>{loadError ?? "No templates are available yet."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/projects">
                        <Button variant="secondary">Back to projects</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // ── Generating splash ─────────────────────────────────────────────────────

    if (step === "generating") {
        return (
            <Card className="border-0 bg-gradient-to-br from-primary-50 via-white to-white">
                <CardHeader className="items-center py-16 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-500 text-white shadow-lg shadow-primary-500/25">
                        <SparklesIcon size={28} />
                    </div>
                    <CardTitle className="text-2xl">Generating your project</CardTitle>
                    <CardDescription className="mt-2 max-w-md">
                        Lernard is building your{" "}
                        <span className="font-semibold">{selectedTemplate?.name}</span> document. This
                        takes about 30–60 seconds. You'll land on the project page automatically.
                    </CardDescription>
                    <div className="mt-6 flex gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:300ms]" />
                    </div>
                </CardHeader>
            </Card>
        );
    }

    // ── Shared step header ────────────────────────────────────────────────────

    const stepHeader = (
        <div className="flex items-center gap-3">
            {step === "details" ? (
                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white shadow-sm transition hover:bg-background-subtle"
                    onClick={() => { setSelectedTemplateId(null); setStep("template"); }}
                >
                    <ArrowLeft01Icon size={16} />
                </button>
            ) : (
                <Link
                    href="/projects"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white shadow-sm transition hover:bg-background-subtle"
                >
                    <ArrowLeft01Icon size={16} />
                </Link>
            )}
            <div>
                <h1 className="text-2xl font-semibold text-text-primary">Create new project</h1>
                <div className="mt-1 flex items-center gap-2">
                    <StepDot active={step === "template"} done={step === "details"} label="Template" />
                    <div className="h-px w-6 bg-border" />
                    <StepDot active={step === "details"} done={false} label="Details" />
                </div>
            </div>
        </div>
    );

    // ── Step 1: Template picker ───────────────────────────────────────────────

    if (step === "template") {
        return (
            <div className="space-y-6">
                {stepHeader}
                <Card>
                    <CardHeader>
                        <CardTitle>Choose a template</CardTitle>
                        <CardDescription>
                            Click a template to continue. Lernard will structure the document around your choice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map((template) => {
                                const selected = selectedTemplateId === template.id;
                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        className={`group relative w-full rounded-3xl border-2 p-4 text-left transition duration-150 ${
                                            selected
                                                ? "border-primary-500 bg-primary-50 shadow-md shadow-primary-100"
                                                : "border-border bg-white hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm"
                                        }`}
                                        onClick={() => {
                                            setSelectedTemplateId(template.id);
                                            setStep("details");
                                        }}
                                    >
                                        {selected && (
                                            <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                                                <CheckmarkCircle02Icon size={12} />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 shrink-0 rounded-2xl ${levelAccent(template.level)} shadow-sm transition group-hover:scale-105`} />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-text-primary">{template.name}</p>
                                                <p className="text-sm text-text-secondary">{template.subject}</p>
                                            </div>
                                        </div>
                                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-text-tertiary">{template.description}</p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <Badge tone={levelTone(template.level)}>{levelLabel(template.level)}</Badge>
                                            <Badge tone="warm">{template.totalMarks} marks</Badge>
                                            <Badge tone="cool">{template.steps.length} sections</Badge>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Step 2: Details form ──────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {stepHeader}

            {selectedTemplate && (
                <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
                    <div className={`h-8 w-8 shrink-0 rounded-xl ${levelAccent(selectedTemplate.level)}`} />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-primary-900">{selectedTemplate.name}</p>
                        <p className="text-xs text-primary-700">
                            {selectedTemplate.subject} • {levelLabel(selectedTemplate.level)} • {selectedTemplate.totalMarks} marks
                        </p>
                    </div>
                    <button
                        type="button"
                        className="text-xs font-medium text-primary-600 hover:underline"
                        onClick={() => { setSelectedTemplateId(null); setStep("template"); }}
                    >
                        Change
                    </button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>About you</CardTitle>
                    <CardDescription>This information appears on the generated project document.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="fullName">Full name *</label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" maxLength={80} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="schoolName">School *</label>
                        <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Your school name" maxLength={120} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="candidateNumber">Candidate number *</label>
                        <Input id="candidateNumber" value={candidateNumber} onChange={(e) => setCandidateNumber(e.target.value)} placeholder="e.g. 12345" maxLength={32} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="className">Class *</label>
                        <Input id="className" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Form 4A" maxLength={40} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Project context</CardTitle>
                    <CardDescription>Help Lernard generate content grounded in your actual setting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="community">Community / setting *</label>
                        <Input id="community" value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="e.g. A small-scale farming community in rural Mashonaland" maxLength={120} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="problemStatement">Problem statement *</label>
                        <Textarea
                            id="problemStatement"
                            value={problemStatement}
                            onChange={(e) => setProblemStatement(e.target.value)}
                            placeholder="Describe the problem or question you are investigating…"
                            maxLength={300}
                            className="min-h-[96px]"
                        />
                        <p className="text-right text-xs text-text-tertiary">{problemStatement.length}/300</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="availableResources">Available resources *</label>
                        <Textarea
                            id="availableResources"
                            value={availableResources}
                            onChange={(e) => setAvailableResources(e.target.value)}
                            placeholder="List materials, people, data, or equipment you have access to…"
                            maxLength={300}
                            className="min-h-[80px]"
                        />
                        <p className="text-right text-xs text-text-tertiary">{availableResources.length}/300</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="topicHint">
                            Topic hint <span className="font-normal text-text-tertiary">(optional)</span>
                        </label>
                        <Input id="topicHint" value={topicHint} onChange={(e) => setTopicHint(e.target.value)} placeholder="e.g. Soil erosion from overgrazing" maxLength={200} />
                        <p className="text-xs text-text-tertiary">A specific topic produces more focused section content.</p>
                    </div>
                </CardContent>
            </Card>

            {formError && (
                <div className="rounded-2xl border border-warning/50 bg-warning-bg px-4 py-3 text-sm text-warning">
                    {formError}
                </div>
            )}

            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    className="flex-[0_0_auto] px-6"
                    onClick={() => { setSelectedTemplateId(null); setStep("template"); }}
                >
                    <ArrowLeft01Icon size={15} className="mr-1.5" />
                    Back
                </Button>
                <Button
                    className="flex-1"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !detailsValid || !selectedTemplate}
                >
                    <SparklesIcon size={16} className="mr-2" />
                    Generate project
                </Button>
            </div>
        </div>
    );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
    return (
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-primary-600" : done ? "text-success" : "text-text-tertiary"}`}>
            <span className={`h-2 w-2 rounded-full ${active ? "bg-primary-500" : done ? "bg-success" : "bg-border"}`} />
            {label}
        </span>
    );
}
