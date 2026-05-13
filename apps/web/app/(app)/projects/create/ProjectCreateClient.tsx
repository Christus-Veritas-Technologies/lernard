"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft01Icon,
    SparklesIcon,
} from "hugeicons-react";
import Link from "next/link";

import { ROUTES } from "@lernard/routes";
import type { PagePayload, PlanUsage, ProgressContent, ProjectLevel } from "@lernard/shared-types";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { browserApiFetch, tryParsePlanLimitError } from "@/lib/browser-api";
import { HardPaywall } from "@/components/quota/HardPaywall";

type CreateStep = "details" | "generating";

function generateUUID(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const LEVEL_OPTIONS: { value: ProjectLevel; label: string }[] = [
    { value: "grade7", label: "Grade 7" },
    { value: "olevel", label: "Form 4 (O Level)" },
    { value: "alevel", label: "Form 6 (A Level)" },
];

export function ProjectCreateClient() {
    const router = useRouter();

    const [step, setStep] = useState<CreateStep>("details");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

    const [fullName, setFullName] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [candidateNumber, setCandidateNumber] = useState("");
    const [centreNumber, setCentreNumber] = useState("");
    const [subject, setSubject] = useState("");
    const [level, setLevel] = useState<ProjectLevel>("olevel");

    useEffect(() => {
        void browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((d) => setPlanUsage(d.content.planUsage))
            .catch(() => undefined);
    }, []);

    const isProjectsExhausted =
        planUsage !== null && planUsage.projectsLimit > 0 && planUsage.projectsUsed >= planUsage.projectsLimit;

    const detailsValid =
        fullName.trim().length > 0 &&
        schoolName.trim().length > 0 &&
        candidateNumber.trim().length > 0 &&
        centreNumber.trim().length > 0 &&
        subject.trim().length > 0;

    async function handleSubmit() {
        if (!detailsValid) return;
        setFormError(null);
        setSubmitting(true);
        setStep("generating");

        try {
            const draft = await browserApiFetch<{ draftId: string }>(ROUTES.PROJECTS.CREATE_DRAFT, {
                method: "POST",
                body: JSON.stringify({
                    subject: subject.trim(),
                    level,
                    studentInfo: {
                        fullName: fullName.trim(),
                        schoolName: schoolName.trim(),
                        candidateNumber: candidateNumber.trim(),
                        centreNumber: centreNumber.trim(),
                    },
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
            const resetAt = tryParsePlanLimitError(err);
            if (resetAt !== null) {
                if (planUsage) {
                    setPlanUsage({ ...planUsage, projectsUsed: planUsage.projectsLimit });
                } else {
                    router.push("/plans");
                }
                setStep("details");
            } else {
                setFormError(err instanceof Error ? err.message : "Could not create project. Please try again.");
                setSubmitting(false);
                setStep("details");
            }
        }
    }

    if (isProjectsExhausted && planUsage) {
        return (
            <div className="relative min-h-[400px]">
                <HardPaywall resource="projects" resetAt={planUsage.resetAt} />
            </div>
        );
    }

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
                        <span className="font-semibold">{subject}</span> document. This
                        takes about 30–60 seconds. You will land on the project page automatically.
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/projects"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white shadow-sm transition hover:bg-background-subtle"
                >
                    <ArrowLeft01Icon size={16} />
                </Link>
                <h1 className="text-2xl font-semibold text-text-primary">New project</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your details</CardTitle>
                    <CardDescription>
                        These appear on the generated project document. Lernard will generate all content and assign marks automatically.
                    </CardDescription>
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
                        <Input id="candidateNumber" value={candidateNumber} onChange={(e) => setCandidateNumber(e.target.value)} placeholder="e.g. 123456" maxLength={32} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="centreNumber">Centre number *</label>
                        <Input id="centreNumber" value={centreNumber} onChange={(e) => setCentreNumber(e.target.value)} placeholder="e.g. 04321" maxLength={32} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-semibold text-text-primary" htmlFor="subject">Subject *</label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Biology, Geography, History" maxLength={300} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <p className="text-sm font-semibold text-text-primary">Level *</p>
                        <div className="flex flex-wrap gap-2">
                            {LEVEL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setLevel(opt.value)}
                                    className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                                        level === opt.value
                                            ? "border-primary-500 bg-primary-50 text-primary-700"
                                            : "border-border bg-white text-text-secondary hover:border-primary-200"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {formError && (
                <div className="rounded-2xl border border-warning/50 bg-warning-bg px-4 py-3 text-sm text-warning">
                    {formError}
                </div>
            )}

            <Button
                className="w-full"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={submitting || !detailsValid}
            >
                <SparklesIcon size={16} className="mr-2" />
                Generate project
            </Button>
        </div>
    );
}
