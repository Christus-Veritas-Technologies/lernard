"use client";

import { LockIcon } from "hugeicons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { PagePayload, PlanUsage, ProgressContent } from "@lernard/shared-types";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

interface LessonListItem {
    lessonId: string;
    topic: string;
    subjectName: string;
    completedAt: string | null;
}

export function QuizEntryClient() {
    const router = useRouter();
    const params = useSearchParams();

    const initialLessonId = params.get("lessonId") ?? "";
    const initialTopic = params.get("topic") ?? "";

    const [topic, setTopic] = useState(initialTopic);
    const [selectedLessonId, setSelectedLessonId] = useState(initialLessonId);
    const [questionCount, setQuestionCount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [lessons, setLessons] = useState<LessonListItem[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

    useEffect(() => {
        void browserApiFetch<LessonListItem[]>(ROUTES.LESSONS.LIST)
            .then(setLessons)
            .catch(() => {});
    }, []);

    useEffect(() => {
        browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((data) => setPlanUsage(data.content.planUsage))
            .catch(() => {});
    }, []);

    const selectedLesson = lessons.find((l) => l.lessonId === selectedLessonId);

    const isExplorer = planUsage?.plan === "explorer";
    const quizPct = planUsage && planUsage.quizzesLimit > 0
        ? Math.round((planUsage.quizzesUsed / planUsage.quizzesLimit) * 100)
        : 0;
    const atQuizLimit = planUsage !== null && planUsage.quizzesLimit > 0 && planUsage.quizzesUsed >= planUsage.quizzesLimit;
    const nearingQuizLimit = !atQuizLimit && quizPct >= 75;

    function selectLesson(lesson: LessonListItem) {
        setSelectedLessonId(lesson.lessonId);
        setTopic(lesson.topic);
        setPickerOpen(false);
    }

    function clearLesson() {
        setSelectedLessonId("");
        setTopic("");
    }

    async function onGenerate() {
        if (!topic.trim() || atQuizLimit) return;

        setLoading(true);
        try {
            const response = await browserApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: topic.trim(),
                    questionCount,
                    idempotencyKey: crypto.randomUUID(),
                    fromLessonId: selectedLessonId || undefined,
                }),
            });

            router.push(`/quiz/${response.quizId}`);
        } finally {
            setLoading(false);
        }
    }

    // Explorer gate: quizzes not included in Explorer plan
    if (isExplorer) {
        return (
            <div className="relative">
                {/* Blurred background form */}
                <Card className="blur-sm select-none pointer-events-none" aria-hidden>
                    <CardHeader>
                        <CardTitle>Test yourself</CardTitle>
                        <CardDescription>Build a quiz on this topic.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <Textarea
                            disabled
                            placeholder="Topic to quiz — e.g. CORS, photosynthesis, quadratic equations"
                            value=""
                            onChange={() => {}}
                        />
                        <Button disabled>Generate Quiz</Button>
                    </CardContent>
                </Card>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 p-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <LockIcon size={24} strokeWidth={1.8} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-text-primary">
                                Quizzes require Scholar
                            </h2>
                            <p className="mt-1 text-sm text-text-secondary">
                                Upgrade to Scholar to unlock unlimited quizzes and sharpen what you've learned.
                            </p>
                        </div>
                        <Link href="/plans">
                            <Button>View plans</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test yourself</CardTitle>
                <CardDescription>Build a quiz on this topic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Plan usage row */}
                {planUsage && planUsage.quizzesLimit > 0 && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>Monthly quizzes</span>
                            <span>{planUsage.quizzesUsed} / {planUsage.quizzesLimit}</span>
                        </div>
                        <Progress
                            value={quizPct}
                            className={atQuizLimit ? "[&>div]:bg-destructive" : nearingQuizLimit ? "[&>div]:bg-warning" : undefined}
                        />
                        {atQuizLimit && (
                            <p className="text-xs text-destructive">
                                Limit reached — resets {formatDate(planUsage.resetAt)}.{" "}
                                <Link href="/settings?tab=plan" className="underline underline-offset-2">
                                    View plans
                                </Link>
                            </p>
                        )}
                        {nearingQuizLimit && (
                            <p className="text-xs text-warning">
                                {planUsage.quizzesLimit - planUsage.quizzesUsed} quizzes remaining this month.
                            </p>
                        )}
                    </div>
                )}

                {selectedLesson ? (
                    <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2">
                        <span className="flex-1 text-xs font-medium text-primary-700">
                            From lesson: {selectedLesson.topic}
                        </span>
                        <button
                            className="text-xs text-primary-500 hover:text-primary-700"
                            onClick={clearLesson}
                            type="button"
                        >
                            ×
                        </button>
                    </div>
                ) : null}

                <Textarea
                    disabled={atQuizLimit}
                    maxLength={300}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Topic to quiz — e.g. CORS, photosynthesis, quadratic equations"
                    value={topic}
                />

                {!selectedLesson && lessons.length > 0 ? (
                    <div className="space-y-2">
                        <button
                            className="text-xs font-medium text-primary-600 hover:text-primary-800"
                            onClick={() => setPickerOpen((v) => !v)}
                            type="button"
                        >
                            {pickerOpen ? "Hide lessons ↑" : "Pick from a lesson ↓"}
                        </button>
                        {pickerOpen ? (
                            <div className="flex flex-wrap gap-2">
                                {lessons.map((lesson) => (
                                    <button
                                        className="rounded-xl border border-border bg-background-subtle px-3 py-1.5 text-left text-xs hover:border-primary-300 hover:bg-primary-50"
                                        key={lesson.lessonId}
                                        onClick={() => selectLesson(lesson)}
                                        type="button"
                                    >
                                        <span className="font-medium text-text-primary">{lesson.topic}</span>
                                        <span className="ml-1.5 text-text-tertiary">{lesson.subjectName}</span>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="space-y-3">
                    <Label>Quiz length</Label>
                    <RadioGroup
                        className="grid grid-cols-3 gap-3"
                        onValueChange={(value) => setQuestionCount(Number(value))}
                        value={String(questionCount)}
                    >
                        {[5, 10, 15].map((value) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={value}
                            >
                                <RadioGroupItem value={String(value)} />
                                <span>{value}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <Button disabled={loading || !topic.trim() || atQuizLimit} onClick={onGenerate}>
                    {loading ? "Generating..." : "Generate Quiz"}
                </Button>
            </CardContent>
        </Card>
    );
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString();
}


interface LessonListItem {
    lessonId: string;
    topic: string;
    subjectName: string;
    completedAt: string | null;
}

export function QuizEntryClient() {
    const router = useRouter();
    const params = useSearchParams();

    const initialLessonId = params.get("lessonId") ?? "";
    const initialTopic = params.get("topic") ?? "";

    const [topic, setTopic] = useState(initialTopic);
    const [selectedLessonId, setSelectedLessonId] = useState(initialLessonId);
    const [questionCount, setQuestionCount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [lessons, setLessons] = useState<LessonListItem[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        void browserApiFetch<LessonListItem[]>(ROUTES.LESSONS.LIST)
            .then(setLessons)
            .catch(() => {});
    }, []);

    const selectedLesson = lessons.find((l) => l.lessonId === selectedLessonId);

    function selectLesson(lesson: LessonListItem) {
        setSelectedLessonId(lesson.lessonId);
        setTopic(lesson.topic);
        setPickerOpen(false);
    }

    function clearLesson() {
        setSelectedLessonId("");
        setTopic("");
    }

    async function onGenerate() {
        if (!topic.trim()) return;

        setLoading(true);
        try {
            const response = await browserApiFetch<{ quizId: string }>(ROUTES.QUIZZES.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: topic.trim(),
                    questionCount,
                    idempotencyKey: crypto.randomUUID(),
                    fromLessonId: selectedLessonId || undefined,
                }),
            });

            router.push(`/quiz/${response.quizId}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test yourself</CardTitle>
                <CardDescription>Build a quiz on this topic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {selectedLesson ? (
                    <div className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2">
                        <span className="flex-1 text-xs font-medium text-primary-700">
                            From lesson: {selectedLesson.topic}
                        </span>
                        <button
                            className="text-xs text-primary-500 hover:text-primary-700"
                            onClick={clearLesson}
                            type="button"
                        >
                            ×
                        </button>
                    </div>
                ) : null}

                <Textarea
                    maxLength={300}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Topic to quiz — e.g. CORS, photosynthesis, quadratic equations"
                    value={topic}
                />

                {!selectedLesson && lessons.length > 0 ? (
                    <div className="space-y-2">
                        <button
                            className="text-xs font-medium text-primary-600 hover:text-primary-800"
                            onClick={() => setPickerOpen((v) => !v)}
                            type="button"
                        >
                            {pickerOpen ? "Hide lessons ↑" : "Pick from a lesson ↓"}
                        </button>
                        {pickerOpen ? (
                            <div className="flex flex-wrap gap-2">
                                {lessons.map((lesson) => (
                                    <button
                                        className="rounded-xl border border-border bg-background-subtle px-3 py-1.5 text-left text-xs hover:border-primary-300 hover:bg-primary-50"
                                        key={lesson.lessonId}
                                        onClick={() => selectLesson(lesson)}
                                        type="button"
                                    >
                                        <span className="font-medium text-text-primary">{lesson.topic}</span>
                                        <span className="ml-1.5 text-text-tertiary">{lesson.subjectName}</span>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="space-y-3">
                    <Label>Quiz length</Label>
                    <RadioGroup
                        className="grid grid-cols-3 gap-3"
                        onValueChange={(value) => setQuestionCount(Number(value))}
                        value={String(questionCount)}
                    >
                        {[5, 10, 15].map((value) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={value}
                            >
                                <RadioGroupItem value={String(value)} />
                                <span>{value}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <Button disabled={loading || !topic.trim()} onClick={onGenerate}>
                    {loading ? "Generating..." : "Generate Quiz"}
                </Button>
            </CardContent>
        </Card>
    );
}
