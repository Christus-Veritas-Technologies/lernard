"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

function QuizResultsContent({ quizId }: { quizId: string }) {
    const searchParams = useSearchParams();
    const topic = searchParams.get("topic") ?? "Quiz";
    const subject = searchParams.get("subject") ?? "";
    const correct = Number(searchParams.get("correct") ?? 0);
    const total = Number(searchParams.get("total") ?? 0);
    const xpEarned = Number(searchParams.get("xp") ?? 0);

    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const grade = pct >= 80 ? "Strong" : pct >= 50 ? "Good effort" : "Keep practising";

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-8 py-16 text-center">
            {/* Icon */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-4xl">
                {pct >= 80 ? "🏆" : pct >= 50 ? "📈" : "💪"}
            </div>

            {/* Heading */}
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-500">{subject}</p>
                <h1 className="text-3xl font-semibold text-text-primary">Quiz complete!</h1>
                <p className="text-lg text-text-secondary">{topic}</p>
            </div>

            {/* Score */}
            <div className="flex w-full flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
                <div className="flex items-start justify-between">
                    <div className="text-left">
                        <p className="text-sm text-text-secondary">Score</p>
                        <p className="text-4xl font-bold text-primary-600">{pct}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-text-secondary">XP earned</p>
                        <p className="text-4xl font-bold text-primary-600">+{xpEarned}</p>
                    </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-background-subtle">
                    <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-sm text-text-secondary">
                    {correct} out of {total} correct · {grade}
                </p>
            </div>

            {/* Result card */}
            <Card className="w-full text-left">
                <CardHeader>
                    <CardTitle className="text-base">
                        {pct >= 80 ? "You&apos;re strong here" : "Room to grow"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm leading-6 text-text-secondary">
                        {pct >= 80
                            ? `You scored ${pct}% on ${topic}. That&apos;s solid — consider going deeper or moving on to a related topic.`
                            : `You scored ${pct}% on ${topic}. A focused lesson on this topic will help consolidate the areas you missed.`}
                    </p>
                </CardContent>
            </Card>

            {/* CTAs */}
            <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1" size="lg">
                    <Link href={`/learn?topic=${encodeURIComponent(topic)}`}>Study this topic →</Link>
                </Button>
                <Button asChild className="flex-1" size="lg" variant="secondary">
                    <Link href="/learn">Back to Learn</Link>
                </Button>
            </div>
        </div>
    );
}

export function QuizResultsClient({ quizId }: { quizId: string }) {
    return (
        <Suspense>
            <QuizResultsContent quizId={quizId} />
        </Suspense>
    );
}
