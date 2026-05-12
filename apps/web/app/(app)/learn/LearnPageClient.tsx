"use client";

import {
    AlertCircleIcon,
    BookOpen01Icon,
    Cancel01Icon,
    DocumentAttachmentIcon,
    ImageUploadIcon,
    PencilEdit01Icon,
    SparklesIcon,
    UploadCircle02Icon,
} from "hugeicons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { PagePayload, PlanUsage, ProgressContent, QuizHistoryItem, QuizHistoryResponse } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";
import { HardPaywall } from "@/components/quota/HardPaywall";

type Source = "text" | "quiz" | "image" | "document";

interface UploadResult {
    uploadId: string;
    kind: "image" | "pdf";
    fileName: string;
    mimeType: string;
    size: number;
}

const SOURCE_TABS: { id: Source; label: string; icon: ReactNode }[] = [
    { id: "text", label: "Text", icon: <PencilEdit01Icon size={15} /> },
    { id: "quiz", label: "Past Practice Exam", icon: <BookOpen01Icon size={15} /> },
    { id: "image", label: "Image", icon: <ImageUploadIcon size={15} /> },
    { id: "document", label: "Document", icon: <DocumentAttachmentIcon size={15} /> },
];

export function LearnPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [source, setSource] = useState<Source>("text");
    const [topic, setTopic] = useState(searchParams.get("topic") ?? "");
    const [depth, setDepth] = useState<"quick" | "standard" | "deep">(
        (searchParams.get("depth") as "quick" | "standard" | "deep") ?? "standard",
    );
    const [loading, setLoading] = useState(false);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

    const [quizSearch, setQuizSearch] = useState("");
    const [quizzes, setQuizzes] = useState<QuizHistoryItem[]>([]);
    const [quizzesLoaded, setQuizzesLoaded] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizHistoryItem | null>(null);

    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const loadPlanUsage = useCallback(() => {
        void browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((data) => setPlanUsage(data.content.planUsage))
            .catch(() => { /* non-blocking */ });
    }, []);

    const loadQuizzes = useCallback(async () => {
        if (quizzesLoaded) return;

        try {
            const data = await browserApiFetch<QuizHistoryResponse>(`${ROUTES.QUIZZES.HISTORY}?limit=20&status=completed`);
            setQuizzes(data.quizzes);
        } catch {
            setQuizzes([]);
        } finally {
            setQuizzesLoaded(true);
        }
    }, [quizzesLoaded]);

    useEffect(() => {
        loadPlanUsage();

        const onFocus = () => {
            loadPlanUsage();
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                loadPlanUsage();
            }
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [loadPlanUsage]);

    function switchSource(nextSource: Source) {
        setSource(nextSource);
        setUploadResult(null);
        setImagePreviewUrl(null);
        setUploadError(null);
        if (nextSource === "quiz") {
            void loadQuizzes();
        }
    }

    function formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function handleFileChange(file: File, kind: "image" | "document") {
        setUploadError(null);
        setUploadResult(null);
        setImagePreviewUrl(null);

        if (kind === "image") {
            setImagePreviewUrl(URL.createObjectURL(file));
        }

        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const result = await browserApiFetch<UploadResult>(ROUTES.LESSONS.ATTACHMENTS_UPLOAD, {
                method: "POST",
                body: form,
            });
            setUploadResult(result);
        } catch {
            setUploadError("Upload failed. Please try again.");
            setImagePreviewUrl(null);
        } finally {
            setUploading(false);
        }
    }

    function clearUpload() {
        setUploadResult(null);
        setImagePreviewUrl(null);
        setUploadError(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (docInputRef.current) docInputRef.current.value = "";
    }

    const filteredQuizzes = quizzes.filter(
        (quiz) =>
            quiz.topic.toLowerCase().includes(quizSearch.toLowerCase())
            || quiz.subjectName.toLowerCase().includes(quizSearch.toLowerCase()),
    );

    const remaining = 300 - topic.length;

    const lessonPct = planUsage
        ? Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)
        : 0;
    const atLimit = planUsage !== null && planUsage.lessonsUsed >= planUsage.lessonsLimit;
    const nearingLimit = !atLimit && lessonPct >= 75;

    const canGenerate = (() => {
        if (loading || uploading || atLimit) return false;
        if (source === "text") return topic.trim().length > 0;
        if (source === "quiz") return selectedQuiz !== null;
        return uploadResult !== null;
    })();

    const onGenerate = async () => {
        if (!canGenerate) return;

        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                depth,
                idempotencyKey: crypto.randomUUID(),
            };

            if (source === "text") {
                body.topic = topic.trim();
            } else if (source === "quiz" && selectedQuiz) {
                body.fromQuizId = selectedQuiz.quizId;
            } else if (uploadResult) {
                body.fromUploadId = uploadResult.uploadId;
                body.fromUploadKind = uploadResult.kind;
            }

            const response = await browserApiFetch<{ lessonId: string }>(ROUTES.LESSONS.GENERATE, {
                method: "POST",
                body: JSON.stringify(body),
            });

            setPlanUsage((current) => {
                if (!current) return current;
                return {
                    ...current,
                    lessonsUsed: Math.min(current.lessonsUsed + 1, current.lessonsLimit),
                };
            });

            router.push(`/learn/${response.lessonId}/loading`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <Card>
                <CardHeader>
                    <CardTitle>What do you want to learn today?</CardTitle>
                    <CardDescription>Turn any topic into a personalized lesson.</CardDescription>
                </CardHeader>
            <CardContent className="space-y-5">
                {/* Plan usage row */}
                {planUsage && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>
                                {planUsage.plan === "explorer" ? "Daily" : "Monthly"} lessons
                            </span>
                            <span>
                                {planUsage.lessonsUsed} / {planUsage.lessonsLimit}
                            </span>
                        </div>
                        <Progress
                            value={lessonPct}
                            className={atLimit ? "[&>div]:bg-destructive" : nearingLimit ? "[&>div]:bg-warning" : undefined}
                        />
                        {atLimit && (
                            <div className="flex items-center gap-1.5 text-xs text-destructive">
                                <AlertCircleIcon size={12} strokeWidth={2} />
                                <span>
                                    Limit reached — resets {formatDate(planUsage.resetAt)}.{" "}
                                    <Link href="/settings?tab=plan" className="underline underline-offset-2">
                                        View plans
                                    </Link>
                                </span>
                            </div>
                        )}
                        {nearingLimit && (
                            <p className="text-xs text-warning">
                                {planUsage.lessonsLimit - planUsage.lessonsUsed} lessons remaining this{" "}
                                {planUsage.plan === "explorer" ? "day" : "month"}.
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <Label className="mb-2 block">Generate lesson from</Label>
                    <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-background-subtle p-1">
                        {SOURCE_TABS.map((tab) => (
                            <button
                                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                                    source === tab.id
                                        ? "bg-white text-text-primary shadow-sm"
                                        : "text-text-tertiary hover:text-text-secondary"
                                }`}
                                key={tab.id}
                                onClick={() => switchSource(tab.id)}
                                type="button"
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-1 flex sm:hidden">
                        {SOURCE_TABS.map((tab) => (
                            <span
                                className={`flex-1 text-center text-[10px] ${source === tab.id ? "font-semibold text-text-primary" : "text-text-tertiary"}`}
                                key={tab.id}
                            >
                                {tab.label}
                            </span>
                        ))}
                    </div>
                </div>

                {source === "text" ? (
                    <div className="space-y-2">
                        <Textarea
                            autoFocus
                            disabled={atLimit}
                            maxLength={300}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder="Type a topic, question, or concept"
                            value={topic}
                        />
                        <div className="flex items-center justify-between">
                            <Badge tone="cool">Subject auto-detected</Badge>
                            <p className="text-xs text-text-tertiary">{remaining} chars left</p>
                        </div>
                    </div>
                ) : null}

                {source === "quiz" ? (
                    <div className="space-y-2">
                        {selectedQuiz ? (
                            <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5">
                                <BookOpen01Icon className="shrink-0 text-primary-500" size={14} />
                                <span className="flex-1 text-sm font-medium text-primary-700">
                                    {selectedQuiz.topic}
                                </span>
                                <button
                                    className="shrink-0 text-primary-400 hover:text-primary-700"
                                    onClick={() => {
                                        setSelectedQuiz(null);
                                        setQuizSearch("");
                                    }}
                                    type="button"
                                >
                                    <Cancel01Icon size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none"
                                    onChange={(event) => setQuizSearch(event.target.value)}
                                    placeholder="Search past practice exams..."
                                    type="text"
                                    value={quizSearch}
                                />
                                <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                                    {!quizzesLoaded ? (
                                        <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                                            Loading practice exams...
                                        </p>
                                    ) : filteredQuizzes.length === 0 ? (
                                        <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                                            {quizSearch ? "No practice exams match your search." : "No completed practice exams yet."}
                                        </p>
                                    ) : (
                                        filteredQuizzes.map((quiz) => (
                                            <button
                                                className="w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-background-subtle"
                                                key={quiz.quizId}
                                                onClick={() => setSelectedQuiz(quiz)}
                                                type="button"
                                            >
                                                <p className="text-sm font-medium text-text-primary">
                                                    {quiz.topic}
                                                </p>
                                                <p className="mt-0.5 text-xs text-text-tertiary">
                                                    {quiz.subjectName}
                                                </p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : null}

                {source === "image" ? (
                    <div className="space-y-2">
                        <input
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    void handleFileChange(file, "image");
                                }
                            }}
                            ref={imageInputRef}
                            type="file"
                        />
                        {uploadResult && imagePreviewUrl ? (
                            <div className="relative overflow-hidden rounded-xl border border-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    alt="Upload preview"
                                    className="max-h-48 w-full object-cover"
                                    src={imagePreviewUrl}
                                />
                                <div className="flex items-center justify-between bg-background-subtle px-3 py-2">
                                    <span className="truncate text-xs text-text-secondary">
                                        {uploadResult.fileName}
                                    </span>
                                    <button
                                        className="ml-2 shrink-0 text-xs text-primary-600 hover:text-primary-800"
                                        onClick={() => {
                                            clearUpload();
                                            imageInputRef.current?.click();
                                        }}
                                        type="button"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-text-tertiary transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                                disabled={uploading}
                                onClick={() => imageInputRef.current?.click()}
                                type="button"
                            >
                                {uploading ? (
                                    <UploadCircle02Icon className="animate-spin" size={28} />
                                ) : (
                                    <ImageUploadIcon size={28} />
                                )}
                                <span className="text-sm font-medium">
                                    {uploading ? "Uploading..." : "Click to upload an image"}
                                </span>
                                <span className="text-xs">PNG, JPG, WEBP, GIF - up to 15 MB</span>
                            </button>
                        )}
                        {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
                    </div>
                ) : null}

                {source === "document" ? (
                    <div className="space-y-2">
                        <input
                            accept="application/pdf"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    void handleFileChange(file, "document");
                                }
                            }}
                            ref={docInputRef}
                            type="file"
                        />
                        {uploadResult ? (
                            <div className="flex items-center gap-3 rounded-xl border border-border bg-background-subtle px-4 py-3">
                                <DocumentAttachmentIcon className="shrink-0 text-primary-500" size={20} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                        {uploadResult.fileName}
                                    </p>
                                    <p className="text-xs text-text-tertiary">
                                        {formatBytes(uploadResult.size)}
                                    </p>
                                </div>
                                <button
                                    className="shrink-0 text-xs text-primary-600 hover:text-primary-800"
                                    onClick={() => {
                                        clearUpload();
                                        docInputRef.current?.click();
                                    }}
                                    type="button"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <button
                                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-text-tertiary transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                                disabled={uploading}
                                onClick={() => docInputRef.current?.click()}
                                type="button"
                            >
                                {uploading ? (
                                    <UploadCircle02Icon className="animate-spin" size={28} />
                                ) : (
                                    <DocumentAttachmentIcon size={28} />
                                )}
                                <span className="text-sm font-medium">
                                    {uploading ? "Uploading..." : "Click to upload a PDF"}
                                </span>
                                <span className="text-xs">PDF - up to 15 MB</span>
                            </button>
                        )}
                        {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
                    </div>
                ) : null}

                <div className="space-y-3">
                    <Label>Depth</Label>
                    <RadioGroup
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                        onValueChange={(value) => setDepth(value as "quick" | "standard" | "deep")}
                        value={depth}
                    >
                        {[
                            { label: "Quick", value: "quick" },
                            { label: "Full", value: "standard" },
                            { label: "Deep", value: "deep" },
                        ].map((option) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={option.value}
                            >
                                <RadioGroupItem value={option.value} />
                                <span className="text-sm text-text-primary">{option.label}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="grid gap-3">
                    <Button disabled={atLimit} variant="secondary">
                        <SparklesIcon size={16} strokeWidth={1.8} />
                        Lernard&apos;s Choice
                    </Button>
                    <Button disabled={!canGenerate} onClick={onGenerate}>
                        {loading ? "Generating..." : "Generate Lesson"}
                    </Button>
                </div>
            </CardContent>
        </Card>
        {atLimit && planUsage && (
            <HardPaywall resource="lessons" resetAt={planUsage.resetAt} />
        )}
        </div>
    );
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString();
}
