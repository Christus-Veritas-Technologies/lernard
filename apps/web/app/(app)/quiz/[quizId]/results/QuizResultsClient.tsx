"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type {
    LessonRemediationContextInput,
    LessonRetryContextInput,
    QuizCompletionResult,
    QuizRemediationContext,
} from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { browserApiFetch } from "@/lib/browser-api";

interface QuizResultsClientProps {
    quizId: string;
}

export function QuizResultsClient({ quizId }: QuizResultsClientProps) {
    const router = useRouter();
    const [result, setResult] = useState<QuizCompletionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<"discuss" | "drill" | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        void browserApiFetch<QuizCompletionResult>(ROUTES.QUIZZES.COMPLETE(quizId), {
            method: "POST",
        })
            .then(setResult)
            .finally(() => setLoading(false));
    }, [quizId]);

    async function fetchRemediationContext(): Promise<QuizRemediationContext> {
        return browserApiFetch<QuizRemediationContext>(ROUTES.QUIZZES.REMEDIATION_CONTEXT(quizId));
    }

    async function onDiscuss() {
        setActionLoading("discuss");
        setActionError(null);

        try {
            const remediation = await fetchRemediationContext();
            const reviewPrompt = buildReviewPrompt(remediation);
            const href = `/chat?attachQuizId=${quizId}&prompt=${encodeURIComponent(reviewPrompt)}&entry=quiz-remediation`;
            router.push(href);
        } catch {
            setActionError("Could not load your remediation context. Please try again.");
        } finally {
            setActionLoading(null);
        }
    }

    async function onDrill() {
        setActionLoading("drill");
        setActionError(null);

        try {
            const remediation = await fetchRemediationContext();
            const topic = buildDrillTopic(remediation);
            const lessonResponse = await browserApiFetch<{ lessonId: string }>(ROUTES.LESSONS.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic,
                    subject: remediation.subjectName,
                    depth: remediation.percentageScore <= 45 ? "deep" : "standard",
                    idempotencyKey: crypto.randomUUID(),
                    remediationContext: toLessonRemediationContext(remediation),
                    retryContext: toLessonRetryContext(remediation),
                }),
            });
            router.push(`/learn/${lessonResponse.lessonId}/loading?from=quiz-remediation&quizId=${quizId}`);
        } catch {
            setActionError("Could not start your drill lesson. Please try again.");
        } finally {
            setActionLoading(null);
        }
    }

    if (loading || !result) {
        return <div className="h-72 rounded-3xl bg-background-subtle" />;
    }

    const percentage = Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100);

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

            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

            <div className="grid gap-3 sm:grid-cols-3">
                <Button disabled={actionLoading !== null} onClick={() => void onDiscuss()} variant="secondary">
                    {actionLoading === "discuss" ? "Preparing..." : "Discuss with Lernard"}
                </Button>
                <Button disabled={actionLoading !== null} onClick={() => void onDrill()}>
                    {actionLoading === "drill" ? "Building drill lesson..." : "Drill the weak spots"}
                </Button>
                <Button onClick={() => router.push("/home")} variant="secondary">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}

function buildReviewPrompt(remediation: QuizRemediationContext): string {
    const weakList = remediation.weakSubtopics.slice(0, 3).map((item) => item.name).join(", ");
    const misconception = remediation.misconceptions[0];

    return [
        `Help me review this ${remediation.topic} quiz.`,
        weakList ? `Focus on these weak areas: ${weakList}.` : "Focus on my incorrect questions.",
        misconception
            ? `I believed "${misconception.studentBelievedX}" but the correct idea is "${misconception.correctAnswerIsY}". Explain this clearly.`
            : "Explain my key misconceptions clearly.",
        "Give me a short recovery plan and one quick check question per weak area.",
    ].join(" ");
}

function buildDrillTopic(remediation: QuizRemediationContext): string {
    const weak = remediation.weakSubtopics.slice(0, 3).map((item) => item.name).join(", ");
    const topic = weak
        ? `${remediation.topic} remediation: ${weak}`
        : `${remediation.topic} remediation lesson`;
    return topic.length > 300 ? topic.slice(0, 300) : topic;
}

function toLessonRemediationContext(remediation: QuizRemediationContext): LessonRemediationContextInput {
    return {
        quizId: remediation.quizId,
        percentageScore: remediation.percentageScore,
        weakSubtopics: remediation.weakSubtopics.map((item) => item.name),
        strongSubtopics: remediation.strongSubtopics,
        misconceptions: remediation.misconceptions,
        failedQuestionPrompts: remediation.failedQuestions
            .map((question) => question.questionText.trim())
            .filter(Boolean)
            .slice(0, 6),
    };
}

function toLessonRetryContext(remediation: QuizRemediationContext): LessonRetryContextInput {
    return {
        source: "quiz_remediation",
        quizId: remediation.quizId,
        trigger: "drill_weak_spots",
        previousScore: remediation.percentageScore,
    };
}
