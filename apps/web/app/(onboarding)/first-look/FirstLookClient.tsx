"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CheckmarkCircle02Icon, BookOpen01Icon } from "hugeicons-react";

import { AuthApiError } from "@/lib/auth-client";
import {
    useFirstLookStartQuery,
    useFirstLookSubmitMutation,
    useFirstLookSkipMutation,
} from "@/hooks/useAuthMutations";
import type { FirstLookQuestion } from "@lernard/shared-types";

export function FirstLookClient() {
    const router = useRouter();
    const {
        data: firstLookData,
        isLoading,
        isError: startError,
        error: startErrorPayload,
        refetch,
    } = useFirstLookStartQuery();
    const submitMutation = useFirstLookSubmitMutation();
    const skipMutation = useFirstLookSkipMutation();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});

    const questions: FirstLookQuestion[] = firstLookData?.questions ?? [];
    const current = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const allAnswered = questions.every((_, i) => answers[i] !== undefined);

    function selectAnswer(answer: string) {
        setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
    }

    function handleNext() {
        if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    }

    function handleBack() {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
    }

    async function handleSubmit() {
        const payload = {
            answers: Object.entries(answers).map(([index, answer]) => ({
                index: Number(index),
                answer,
            })),
        };
        submitMutation.mutate(payload, {
            onSuccess: () => router.push("/home"),
        });
    }

    async function handleSkip() {
        skipMutation.mutate(undefined, {
            onSuccess: () => router.push("/home"),
        });
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-48 animate-pulse rounded-xl bg-primary-100" />
                <div className="h-4 w-full animate-pulse rounded-xl bg-background" />
                <div className="h-4 w-3/4 animate-pulse rounded-xl bg-background" />
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-background" />
                ))}
            </div>
        );
    }

    if (startError || questions.length === 0) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">First Look</h1>
                    <p className="mt-1 text-text-secondary">
                        {startErrorPayload instanceof Error
                            ? startErrorPayload.message
                            : "We couldn&apos;t generate your questions right now."}
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                        className="flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-text-primary"
                        onClick={() => void refetch()}
                        type="button"
                    >
                        Retry
                    </button>
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={skipMutation.isPending}
                        className="flex h-12 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {skipMutation.isPending ? "Skipping…" : "Skip for now and go to Lernard"}
                    </button>
                </div>
            </div>
        );
    }

    // Result screen
    if (submitMutation.isSuccess) {
        const result = submitMutation.data;
        return (
            <div className="flex flex-col items-center gap-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-100">
                    <CheckmarkCircle02Icon size={40} className="text-secondary-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">First Look complete!</h1>
                    <p className="mt-2 text-text-secondary">
                        You scored {result.score} / {result.totalQuestions}.
                        Lernard now has your baseline and can personalize your next session.
                    </p>
                </div>
                <div className="w-full rounded-2xl bg-background p-4 text-left">
                    {result.subjectResults.map((sr) => (
                        <div key={sr.subjectId} className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-text-primary">{sr.subject}</span>
                            <span className="text-sm text-text-secondary">
                                {Math.round((sr.score / Math.max(sr.totalQuestions, 1)) * 100)}% - {" "}
                                {sr.strengthLevel.replace("_", " ")}
                            </span>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => router.push("/home")}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white"
                >
                    Go to Lernard
                </button>
            </div>
        );
    }

    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
    const hasSelectedCurrent = Boolean(answers[currentIndex]);

    if (!current) return null;

    return (
        <div className="flex flex-col gap-6">
            {/* Step indicator */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-6 rounded-full bg-primary-200" />
                    <div className="h-px flex-1 bg-primary-200" />
                    <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-bold text-white">
                        Step 2 of 2
                    </span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">First Look</h1>
                        <p className="mt-0.5 text-sm text-text-secondary">
                            A quick quiz to set your baseline.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5">
                        <BookOpen01Icon size={14} className="text-primary-500" />
                        <span className="text-xs font-semibold text-primary-600">
                            {currentIndex + 1}/{questions.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100">
                <div
                    className="h-2 rounded-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Question card */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-primary-100">
                <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-600">
                    {current.subject}
                </span>
                <p className="mt-3 text-lg font-semibold leading-snug text-text-primary">
                    {current.question}
                </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2">
                {current.options.map((option) => {
                    const isSelected = answers[currentIndex] === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => selectAnswer(option)}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all ${isSelected
                                ? "border-primary-400 bg-primary-50 font-medium text-primary-700"
                                : "border-border bg-surface text-text-primary hover:border-primary-200"
                                }`}
                        >
                            <div
                                className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${isSelected ? "border-primary-500 bg-primary-500" : "border-border"
                                    }`}
                            />
                            {option}
                        </button>
                    );
                })}
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
                {currentIndex > 0 && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-text-primary"
                    >
                        Back
                    </button>
                )}
                {isLast ? (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!allAnswered || submitMutation.isPending}
                        className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {submitMutation.isPending ? "Submitting…" : "Submit answers"}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={!hasSelectedCurrent}
                        className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Next
                    </button>
                )}
            </div>

            {!hasSelectedCurrent && !isLast ? (
                <p className="text-xs text-text-tertiary">Choose an option to continue.</p>
            ) : null}

            <button
                type="button"
                onClick={handleSkip}
                disabled={skipMutation.isPending}
                className="text-center text-sm text-text-tertiary hover:text-text-secondary"
            >
                Skip First Look
            </button>

            {(submitMutation.isError || skipMutation.isError) && (
                <p className="text-center text-sm text-error">
                    {submitMutation.isError && submitMutation.error instanceof AuthApiError
                        ? submitMutation.error.message
                        : "Something went wrong. Please try again."}
                </p>
            )}
        </div>
    );
}
