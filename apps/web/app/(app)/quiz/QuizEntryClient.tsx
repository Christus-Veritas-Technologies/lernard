"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";

import { ROUTES } from "@lernard/routes";
import type { Quiz } from "@lernard/shared-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserApiFetch } from "@/lib/browser-api";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
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

function QuizEntryForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromLesson = searchParams.get("fromLesson");

    const [topic, setTopic] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    async function handleGenerate() {
        const finalTopic = topic.trim();
        if (!finalTopic) return;
        setIsGenerating(true);
        setGenerateError(null);
        try {
            const quiz = await browserApiFetch<Quiz>(ROUTES.QUIZZES.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: finalTopic,
                    idempotencyKey: crypto.randomUUID(),
                    ...(fromLesson ? { fromLessonId: fromLesson } : {}),
                }),
            });
            router.push(`/quiz/${quiz.id}`);
        } catch (e) {
            setGenerateError(e instanceof Error ? e.message : "Could not generate quiz. Try again.");
            setIsGenerating(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-xl flex-col gap-8 py-16">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-500">Quiz studio</p>
                <h1 className="text-3xl font-semibold text-text-primary">Test what you know</h1>
                <p className="text-text-secondary">
                    Generate a 10-question quiz on any topic. Lernard will use your skill level to set the right difficulty.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <Input
                    disabled={isGenerating}
                    maxLength={300}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleGenerate()}
                    placeholder="What do you want to be tested on?"
                    value={topic}
                />
                {generateError && <p className="text-sm text-red-600">{generateError}</p>}
                <Button
                    disabled={isGenerating || !topic.trim()}
                    onClick={() => void handleGenerate()}
                    size="lg"
                >
                    {isGenerating ? "Generating quiz…" : "Start quiz →"}
                </Button>
            </div>

            {fromLesson && (
                <p className="text-sm text-text-secondary">
                    Based on your recent lesson. Adjust the topic above to focus on anything specific.
                </p>
            )}
        </div>
    );
}

export function QuizEntryClient() {
    return (
        <Suspense>
            <QuizEntryForm />
        </Suspense>
    );
}
