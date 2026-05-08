"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { QuizCompletionResult } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { browserApiFetch } from "@/lib/browser-api";

interface QuizResultsClientProps {
    quizId: string;
}

export function QuizResultsClient({ quizId }: QuizResultsClientProps) {
    const router = useRouter();
    const [result, setResult] = useState<QuizCompletionResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void browserApiFetch<QuizCompletionResult>(ROUTES.QUIZZES.COMPLETE(quizId), {
            method: "POST",
        })
            .then(setResult)
            .finally(() => setLoading(false));
    }, [quizId]);

    if (loading || !result) {
        return <div className="h-72 rounded-3xl bg-background-subtle" />;
    }

    const percentage = Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100);
    const reviewPrompt = "Help me review this quiz, explain my mistakes, and give me a short recovery plan.";
    const chatReviewHref = `/chat?attachQuizId=${quizId}&prompt=${encodeURIComponent(reviewPrompt)}`;

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>{result.debriefText}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Progress value={percentage} />
                    <p className="text-sm text-text-secondary">
                        {result.score} of {result.totalQuestions} correct
                    </p>
                    <Badge tone="success">+{result.xpEarned} XP</Badge>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Topic Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {result.topicBreakdown.strong.map((topic) => (
                        <Badge key={`s-${topic}`} tone="success">{topic}</Badge>
                    ))}
                    {result.topicBreakdown.needsWork.map((topic) => (
                        <Badge key={`n-${topic}`} tone="warning">{topic}</Badge>
                    ))}
                    {result.topicBreakdown.revisitSoon.map((topic) => (
                        <Badge key={`r-${topic}`} tone="warm">{topic}</Badge>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Question Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {result.questions.map((question, index) => {
                        const evalColor =
                            question.evaluationResult === "correct"
                                ? "border-green-200"
                                : question.evaluationResult === "partial"
                                  ? "border-amber-200"
                                  : question.isCorrect
                                    ? "border-green-200"
                                    : "border-red-200";
                        return (
                            <div className={`rounded-2xl border p-4 ${evalColor}`} key={`${index}-${question.text}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-text-primary">{question.text}</p>
                                    {question.subtopic ? (
                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-text-tertiary">
                                            {question.subtopic}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-2 text-sm text-text-secondary">Your answer: {question.studentAnswer}</p>
                                {question.correctAnswer ? (
                                    <p className="text-sm text-text-secondary">Correct: {question.correctAnswer}</p>
                                ) : null}
                                {question.feedback ? (
                                    <p className="mt-1 text-sm font-medium text-text-secondary">{question.feedback}</p>
                                ) : null}
                                <p className="mt-1 text-sm text-text-secondary">{question.explanation}</p>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={() => router.push(chatReviewHref)} variant="secondary">
                    Discuss with Lernard
                </Button>
                <Button onClick={() => router.push("/quiz")}>Drill the weak spots</Button>
                <Button onClick={() => router.push("/home")} variant="secondary">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
