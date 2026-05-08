"use client";

import { AlertCircleIcon, SparklesIcon } from "hugeicons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { PagePayload, PlanUsage, ProgressContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { browserApiFetch } from "@/lib/browser-api";

export function LearnPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [topic, setTopic] = useState(searchParams.get("topic") ?? "");
    const [depth, setDepth] = useState<"quick" | "standard" | "deep">(
        (searchParams.get("depth") as "quick" | "standard" | "deep") ?? "standard",
    );
    const [loading, setLoading] = useState(false);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

    useEffect(() => {
        browserApiFetch<PagePayload<ProgressContent>>(ROUTES.PROGRESS.OVERVIEW)
            .then((data) => setPlanUsage(data.content.planUsage))
            .catch(() => { /* non-blocking */ });
    }, []);

    const remaining = 300 - topic.length;

    const lessonPct = planUsage
        ? Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)
        : 0;
    const atLimit = planUsage !== null && planUsage.lessonsUsed >= planUsage.lessonsLimit;
    const nearingLimit = !atLimit && lessonPct >= 75;

    const onGenerate = async () => {
        if (!topic.trim() || atLimit) return;

        setLoading(true);
        try {
            const response = await browserApiFetch<{ lessonId: string }>(ROUTES.LESSONS.GENERATE, {
                method: "POST",
                body: JSON.stringify({
                    topic: topic.trim(),
                    depth,
                    idempotencyKey: crypto.randomUUID(),
                }),
            });

            router.push(`/learn/${response.lessonId}/loading`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>What do you want to learn today?</CardTitle>
                <CardDescription>Turn any topic into a personalized lesson.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Plan usage row */}
                {planUsage && (
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>
                                {planUsage.plan === "explorer" ? "Daily" : "Monthly"} lessons
                            </span>
                            <span>
                                {planUsage.lessonsUsed} / {planUsage.lessonsLimit}
                            </span>
                        </div>
                        <Progress
                            value={lessonPct}
                            className={atLimit ? "[&>div]:bg-destructive" : nearingLimit ? "[&>div]:bg-warning" : undefined}
                        />
                        {atLimit && (
                            <div className="flex items-center gap-1.5 text-xs text-destructive">
                                <AlertCircleIcon size={12} strokeWidth={2} />
                                <span>
                                    Limit reached — resets {formatDate(planUsage.resetAt)}.{" "}
                                    <Link href="/settings?tab=plan" className="underline underline-offset-2">
                                        View plans
                                    </Link>
                                </span>
                            </div>
                        )}
                        {nearingLimit && (
                            <p className="text-xs text-warning">
                                {planUsage.lessonsLimit - planUsage.lessonsUsed} lessons remaining this{" "}
                                {planUsage.plan === "explorer" ? "day" : "month"}.
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <Textarea
                        autoFocus
                        disabled={atLimit}
                        maxLength={300}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Type a topic, question, or concept"
                        value={topic}
                    />
                    <div className="flex items-center justify-between">
                        <Badge tone="cool">Subject auto-detected</Badge>
                        <p className="text-xs text-text-tertiary">{remaining} chars left</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Depth</Label>
                    <RadioGroup
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                        onValueChange={(value) => setDepth(value as "quick" | "standard" | "deep")}
                        value={depth}
                    >
                        {[
                            { label: "Quick", value: "quick" },
                            { label: "Full", value: "standard" },
                            { label: "Deep", value: "deep" },
                        ].map((option) => (
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                                key={option.value}
                            >
                                <RadioGroupItem value={option.value} />
                                <span className="text-sm text-text-primary">{option.label}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="grid gap-3">
                    <Button disabled={atLimit} variant="secondary">
                        <SparklesIcon size={16} strokeWidth={1.8} />
                        Lernard&apos;s Choice
                    </Button>
                    <Button disabled={loading || !topic.trim() || atLimit} onClick={onGenerate}>
                        {loading ? "Generating..." : "Generate Lesson"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "soon";
    return d.toLocaleDateString();
}
