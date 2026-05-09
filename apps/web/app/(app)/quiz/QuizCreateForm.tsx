"use client";

import {
    BookOpen01Icon,
    Cancel01Icon,
    DocumentAttachmentIcon,
    ImageUploadIcon,
    PencilEdit01Icon,
    UploadCircle02Icon,
} from "hugeicons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useRef, useState } from "react";

import { ROUTES } from "@lernard/routes";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

type Source = "text" | "lesson" | "image" | "document";

interface LessonListItem {
    lessonId: string;
    topic: string;
    subjectName: string;
    completedAt: string | null;
}

interface UploadResult {
    uploadId: string;
    kind: "image" | "pdf";
    fileName: string;
    mimeType: string;
    size: number;
}

interface QuizCreateFormProps {
    onGenerated?: () => void;
}

const SOURCE_TABS: { id: Source; label: string; icon: ReactNode }[] = [
    { id: "text", label: "Text", icon: <PencilEdit01Icon size={15} /> },
    { id: "lesson", label: "Past lesson", icon: <BookOpen01Icon size={15} /> },
    { id: "image", label: "Image", icon: <ImageUploadIcon size={15} /> },
    { id: "document", label: "Document", icon: <DocumentAttachmentIcon size={15} /> },
];

const MULTIPLE_CHOICE_COUNTS = [5, 10, 15] as const;
const STRUCTURED_COUNTS = [1, 3, 5] as const;

export function QuizCreateForm({ onGenerated }: QuizCreateFormProps) {
    const router = useRouter();
    const params = useSearchParams();

    const initialLessonId = params.get("lessonId") ?? "";
    const initialTopic = params.get("topic") ?? "";

    const [source, setSource] = useState<Source>("text");
    const [questionType, setQuestionType] = useState<"multiple_choice" | "structured">("multiple_choice");
    const [topic, setTopic] = useState(initialTopic);
    const [questionCount, setQuestionCount] = useState(10);
    const [loading, setLoading] = useState(false);

    const [lessonSearch, setLessonSearch] = useState("");
    const [lessons, setLessons] = useState<LessonListItem[]>([]);
    const [lessonsLoaded, setLessonsLoaded] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<LessonListItem | null>(
        initialLessonId && initialTopic
            ? { lessonId: initialLessonId, topic: initialTopic, subjectName: "", completedAt: null }
            : null,
    );

    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const loadLessons = useCallback(async () => {
        if (lessonsLoaded) return;

        try {
            const data = await browserApiFetch<LessonListItem[]>(ROUTES.LESSONS.LIST);
            setLessons(data);
        } catch {
            // Ignore lesson loading failures so text mode still works.
        } finally {
            setLessonsLoaded(true);
        }
    }, [lessonsLoaded]);

    function switchSource(nextSource: Source) {
        setSource(nextSource);
        setUploadResult(null);
        setImagePreviewUrl(null);
        setUploadError(null);
        if (nextSource === "lesson") {
            void loadLessons();
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
            const result = await browserApiFetch<UploadResult>(ROUTES.QUIZZES.ATTACHMENTS_UPLOAD, {
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

    const filteredLessons = lessons.filter(
        (lesson) =>
            lesson.topic.toLowerCase().includes(lessonSearch.toLowerCase())
            || lesson.subjectName.toLowerCase().includes(lessonSearch.toLowerCase()),
    );

    const canGenerate = (() => {
        if (loading || uploading) return false;
        if (source === "text") return topic.trim().length > 0;
        if (source === "lesson") return selectedLesson !== null;
        return uploadResult !== null;
    })();

    function setQuestionTypeWithCount(next: "multiple_choice" | "structured") {
        setQuestionType(next);
        if (next === "structured") {
            if (![1, 3, 5].includes(questionCount)) {
                setQuestionCount(5);
            }
            return;
        }

        if (![5, 10, 15].includes(questionCount)) {
            setQuestionCount(15);
        }
    }

    async function onGenerate() {
        if (!canGenerate) return;

        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                questionCount,
                paperType: "paper2",
                questionType,
                idempotencyKey: crypto.randomUUID(),
            };

            if (source === "text") {
                body.topic = topic.trim();
            } else if (source === "lesson" && selectedLesson) {
                body.topic = selectedLesson.topic;
                body.fromLessonId = selectedLesson.lessonId;
            } else if (uploadResult) {
                body.fromUploadId = uploadResult.uploadId;
                body.fromUploadKind = uploadResult.kind;
            }

            const response = await browserApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
                method: "POST",
                body: JSON.stringify(body),
            });

            onGenerated?.();
            router.push(`/quiz/${response.quizId}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <Label className="mb-2 block">Question type</Label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background-subtle p-1">
                    {([
                        { id: "multiple_choice", label: "Multiple Choice" },
                        { id: "structured", label: "Structured Questions" },
                    ] as const).map((opt) => (
                        <button
                            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                questionType === opt.id
                                    ? "bg-white text-text-primary shadow-sm"
                                    : "text-text-tertiary hover:text-text-secondary"
                            }`}
                            key={opt.id}
                            onClick={() => setQuestionTypeWithCount(opt.id)}
                            type="button"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <p className="mt-1.5 text-xs text-text-tertiary">
                    {questionType === "structured"
                        ? "Generates multi-part exam-style questions with marking schemes."
                        : "Generates a mix of single-answer and select-all-that-apply questions."}
                </p>
            </div>

            <div>
                <Label className="mb-2 block">Generate quiz from</Label>
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
                <div className="space-y-1.5">
                    <Label>Topic</Label>
                    <Textarea
                        maxLength={300}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="e.g. CORS, photosynthesis, quadratic equations"
                        rows={3}
                        value={topic}
                    />
                    <p className="text-right text-xs text-text-tertiary">{topic.length}/300</p>
                </div>
            ) : null}

            {source === "lesson" ? (
                <div className="space-y-2">
                    {selectedLesson ? (
                        <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5">
                            <BookOpen01Icon className="shrink-0 text-primary-500" size={14} />
                            <span className="flex-1 text-sm font-medium text-primary-700">
                                {selectedLesson.topic}
                            </span>
                            <button
                                className="shrink-0 text-primary-400 hover:text-primary-700"
                                onClick={() => {
                                    setSelectedLesson(null);
                                    setLessonSearch("");
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
                                onChange={(event) => setLessonSearch(event.target.value)}
                                placeholder="Search your past lessons..."
                                type="text"
                                value={lessonSearch}
                            />
                            <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                                {!lessonsLoaded ? (
                                    <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                                        Loading lessons...
                                    </p>
                                ) : filteredLessons.length === 0 ? (
                                    <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                                        {lessonSearch ? "No lessons match your search." : "No completed lessons yet."}
                                    </p>
                                ) : (
                                    filteredLessons.map((lesson) => (
                                        <button
                                            className="w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-background-subtle"
                                            key={lesson.lessonId}
                                            onClick={() => setSelectedLesson(lesson)}
                                            type="button"
                                        >
                                            <p className="text-sm font-medium text-text-primary">
                                                {lesson.topic}
                                            </p>
                                            <p className="mt-0.5 text-xs text-text-tertiary">
                                                {lesson.subjectName}
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
                <Label>Quiz length</Label>
                <RadioGroup
                    className="grid grid-cols-3 gap-3"
                    onValueChange={(value) => setQuestionCount(Number(value))}
                    value={String(questionCount)}
                >
                    {(questionType === "structured" ? STRUCTURED_COUNTS : MULTIPLE_CHOICE_COUNTS).map((value) => (
                        <label
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 hover:border-primary-300"
                            key={value}
                        >
                            <RadioGroupItem value={String(value)} />
                            <span>{value} questions</span>
                        </label>
                    ))}
                </RadioGroup>
            </div>

            <Button disabled={!canGenerate} onClick={onGenerate}>
                {loading ? "Generating..." : "Generate Quiz"}
            </Button>
        </div>
    );
}
