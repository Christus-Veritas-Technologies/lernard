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
                            Ã—
                        </button>
                    </div>
                ) : null}

                <Textarea
                    maxLength={300}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Topic to quiz â€” e.g. CORS, photosynthesis, quadratic equations"
                    value={topic}
                />

                {!selectedLesson && lessons.length > 0 ? (
                    <div className="space-y-2">
                        <button
                            className="text-xs font-medium text-primary-600 hover:text-primary-800"
                            onClick={() => setPickerOpen((v) => !v)}
                            type="button"
                        >
                            {pickerOpen ? "Hide lessons â†‘" : "Pick from a lesson â†“"}
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
