"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@lernard/routes";

import { Button } from "@/components/ui/Button";
import { browserApiFetch } from "@/lib/browser-api";

interface PostLessonClientProps {
    lessonId: string;
}

const CONFIDENCE_LABELS: Record<number, { label: string; description: string; color: string; bg: string; border: string }> = {
    1: { label: "Not there yet", description: "Still hazy on this", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-400" },
    2: { label: "Getting it", description: "Starting to click", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-400" },
    3: { label: "Pretty sure", description: "Mostly makes sense", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-400" },
    4: { label: "Confident", description: "Solid understanding", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-400" },
    5: { label: "Nailed it", description: "Could explain this to someone", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-400" },
};

export function PostLessonClient({ lessonId }: PostLessonClientProps) {
    const router = useRouter();
    const params = useSearchParams();
    const topic = params.get("topic") ?? "";
    const [rating, setRating] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [xpEarned, setXpEarned] = useState<number | null>(null);

    async function onRate(value: number) {
        if (xpEarned !== null) return;
        setRating(value);
        setSaving(true);
        try {
            const result = await browserApiFetch<{ xpEarned: number }>(ROUTES.LESSONS.COMPLETE(lessonId), {
                method: "POST",
                body: JSON.stringify({ confidenceRating: value }),
            });
            setXpEarned(result.xpEarned);
        } finally {
            setSaving(false);
        }
    }

    const saved = xpEarned !== null;
    const selectedMeta = rating ? CONFIDENCE_LABELS[rating] : null;

    return (
        <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10 sm:py-16">
            {/* Header */}
            <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-600">Lesson complete</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{topic || "Great work."}</h1>
                <p className="mt-3 text-base text-slate-500">
                    Before you move on — how well do you feel you understand this?
                </p>
            </div>

            {/* Confidence rating */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-700">How confident are you right now?</p>
                <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => {
                        const meta = CONFIDENCE_LABELS[value]!;
                        const isSelected = rating === value;
                        return (
                            <button
                                className={`group flex flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-3 transition-all ${
                                    isSelected
                                        ? `${meta.border} ${meta.bg}`
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                } ${saved ? "cursor-default" : "cursor-pointer"}`}
                                disabled={saving || saved}
                                key={value}
                                onClick={() => void onRate(value)}
                                type="button"
                            >
                                <span className={`text-xl font-bold ${isSelected ? meta.color : "text-slate-400"}`}>{value}</span>
                                <span className={`text-center text-[10px] font-medium leading-tight ${isSelected ? meta.color : "text-slate-400"}`}>
                                    {meta.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex justify-between px-1 text-[11px] text-slate-400">
                    <span>Not confident</span>
                    <span>Totally confident</span>
                </div>

                {/* XP reveal */}
                {saving && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                        Saving...
                    </div>
                )}
                {saved && selectedMeta && (
                    <div className={`mt-5 rounded-2xl border px-4 py-3 text-center ${selectedMeta.border} ${selectedMeta.bg}`}>
                        <p className={`text-sm font-semibold ${selectedMeta.color}`}>
                            {selectedMeta.description} · {xpEarned} XP earned
                        </p>
                    </div>
                )}
            </div>

            {/* Next step actions — only shown after saving */}
            {saved && (
                <div className="flex flex-col gap-3">
                    <p className="text-center text-sm font-medium text-slate-500">What do you want to do next?</p>
                    <Button
                        className="w-full"
                        onClick={() => {
                            const quizUrl = `/practice-exams?lessonId=${lessonId}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
                            router.push(quizUrl);
                        }}
                    >
                        Quiz me on this
                    </Button>
                    <Button
                        className="w-full"
                        onClick={() => router.push("/home")}
                        variant="secondary"
                    >
                        Back to home
                    </Button>
                </div>
            )}
        </div>
    );
}
