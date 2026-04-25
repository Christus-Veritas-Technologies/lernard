"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { ROUTES } from "@lernard/routes";
import type { QuizContent, QuizResultsContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";

interface AnswerState {
    selectedOption: string;
    isCorrect: boolean;
    feedback: string;
    submitted: boolean;
}

export function QuizPageClient({ quizId }: { quizId: string }) {
    const router = useRouter();
    const { data, loading, error } = usePagePayload<QuizContent>(ROUTES.QUIZZES.GET(quizId));

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answerStates, setAnswerStates] = useState<Record<number, AnswerState>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-background-subtle" />
                <div className="h-72 animate-pulse rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-8 text-center">
                <p className="text-text-secondary">{error?.message ?? "Quiz not found."}</p>
            </div>
        );
    }

    const { quiz } = data.content;
    const question = quiz.questions[currentIndex];
    const currentAnswer = answerStates[currentIndex];
    const answeredCount = Object.keys(answerStates).length;
    const isLastQuestion = currentIndex === quiz.questions.length - 1;
    const progressPct = Math.round((answeredCount / quiz.questions.length) * 100);

    async function handleAnswer(option: string, optionIndex: number) {
        if (currentAnswer?.submitted || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const result = await browserApiFetch<{ questionId: string; isCorrect: boolean; feedback: string }>(
                ROUTES.QUIZZES.ANSWER(quizId),
                {
                    method: "POST",
                    body: JSON.stringify({ questionId: String(currentIndex), answer: String(optionIndex) }),
                },
            );
            setAnswerStates((prev) => ({
                ...prev,
                [currentIndex]: {
                    selectedOption: option,
                    isCorrect: result.isCorrect,
                    feedback: result.feedback,
                    submitted: true,
                },
            }));
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Failed to submit answer.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleComplete() {
        setIsCompleting(true);
        try {
            const results = await browserApiFetch<QuizResultsContent>(
                ROUTES.QUIZZES.COMPLETE(quizId),
                { method: "POST" },
            );
            const qs = new URLSearchParams({
                topic: results.topic,
                subject: results.subject,
                correct: String(results.score.correct),
                total: String(results.score.total),
                xp: String(results.xpEarned),
            });
            router.push(`/quiz/${quizId}/results?${qs.toString()}`);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Could not complete quiz.");
            setIsCompleting(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Badge tone="primary">{quiz.subject}</Badge>
                    <span className="ml-auto text-sm text-text-secondary">
                        Q{currentIndex + 1} of {quiz.questions.length}
                    </span>
                </div>
                <h1 className="text-2xl font-semibold text-text-primary">{quiz.topic}</h1>
                <Progress value={progressPct} />
            </div>

            {/* Current question */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl leading-7">{question.question}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {(question.options ?? []).map((option, i) => {
                        const idx = String(i);
                        const isSelected = currentAnswer?.selectedOption === option;
                        let variant: "default" | "secondary" | "outline" = "outline";
                        if (currentAnswer?.submitted && isSelected) {
                            variant = currentAnswer.isCorrect ? "default" : "secondary";
                        }
                        return (
                            <button
                                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors
                                    ${currentAnswer?.submitted && isSelected && currentAnswer.isCorrect
                                        ? "border-green-400 bg-green-50 text-green-900"
                                        : currentAnswer?.submitted && isSelected && !currentAnswer.isCorrect
                                            ? "border-red-300 bg-red-50 text-red-900"
                                            : "border-border bg-surface hover:bg-background-subtle"}`}
                                disabled={!!currentAnswer?.submitted || isSubmitting}
                                key={idx}
                                onClick={() => void handleAnswer(option, i)}
                            >
                                <span className="mr-3 inline-block h-6 w-6 rounded-full border border-current text-center text-xs leading-6">
                                    {String.fromCharCode(65 + i)}
                                </span>
                                {option}
                            </button>
                        );
                    })}
                </CardContent>
                {currentAnswer?.submitted && (
                    <CardFooter className="flex-col items-start gap-2">
                        <p className={`text-sm font-semibold ${currentAnswer.isCorrect ? "text-green-700" : "text-red-700"}`}>
                            {currentAnswer.isCorrect ? "Correct!" : "Not quite."}
                        </p>
                        {currentAnswer.feedback && (
                            <p className="text-sm leading-6 text-text-secondary">{currentAnswer.feedback}</p>
                        )}
                    </CardFooter>
                )}
            </Card>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            {/* Navigation */}
            {currentAnswer?.submitted && (
                <div className="flex gap-3">
                    {!isLastQuestion && (
                        <Button className="flex-1" onClick={() => setCurrentIndex((i) => i + 1)} size="lg">
                            Next question →
                        </Button>
                    )}
                    {isLastQuestion && (
                        <Button
                            className="flex-1"
                            disabled={isCompleting}
                            onClick={() => void handleComplete()}
                            size="lg"
                        >
                            {isCompleting ? "Finishing…" : "See results →"}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
