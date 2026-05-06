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

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Lernard debrief</CardTitle>
                    <CardDescription>You are improving with every attempt.</CardDescription>
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
                    {result.questions.map((question, index) => (
                        <div className="rounded-2xl border border-border p-4" key={`${index}-${question.text}`}>
                            <p className="font-medium text-text-primary">{question.text}</p>
                            <p className="mt-2 text-sm text-text-secondary">Your answer: {question.studentAnswer}</p>
                            {question.correctAnswer ? (
                                <p className="text-sm text-text-secondary">Correct: {question.correctAnswer}</p>
                            ) : null}
                            <p className="mt-1 text-sm text-text-secondary">{question.explanation}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => router.push("/quiz")}>Drill the weak spots</Button>
                <Button onClick={() => router.push("/home")} variant="secondary">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
