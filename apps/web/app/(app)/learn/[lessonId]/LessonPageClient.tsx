"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { LessonContent, LessonSection, PostLessonContent } from "@lernard/shared-types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePagePayload } from "@/hooks/usePagePayload";
import { browserApiFetch } from "@/lib/browser-api";

type SectionCheckResponse = "got_it" | "not_sure" | "confused";

interface SectionCheckState {
    [sectionIndex: number]: SectionCheckResponse;
}

const SECTION_ICONS: Record<string, string> = {
    hook: "💡",
    concept: "📖",
    example: "🔬",
    recap: "✅",
};

const CHECK_OPTIONS: { value: SectionCheckResponse; label: string; emoji: string }[] = [
    { value: "got_it", label: "Got it", emoji: "✓" },
    { value: "not_sure", label: "Not sure", emoji: "~" },
    { value: "confused", label: "Confused", emoji: "?" },
];

export function LessonPageClient({ lessonId }: { lessonId: string }) {
    const router = useRouter();
    const { data, loading, error } = usePagePayload<LessonContent>(ROUTES.LESSONS.GET(lessonId));

    const [sectionChecks, setSectionChecks] = useState<SectionCheckState>({});
    const [checkingSection, setCheckingSection] = useState<number | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);

    if (loading) {

        return (
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-background-subtle" />
                <div className="h-64 animate-pulse rounded-3xl bg-background-subtle" />
                <div className="h-64 animate-pulse rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-8 text-center">
                <p className="text-text-secondary">{error?.message ?? "Lesson not found."}</p>
            </div>
        );
    }

    const { lesson } = data.content;

    const answeredCount = Object.keys(sectionChecks).length;
    const totalSections = lesson.sections.length;
    const progressPct = Math.round((answeredCount / totalSections) * 100);
    const allChecked = answeredCount === totalSections;

    async function handleSectionCheck(section: LessonSection, response: SectionCheckResponse) {
        setCheckingSection(section.index);
        try {
            await browserApiFetch(ROUTES.LESSONS.SECTION_CHECK(lesson.id), {
                method: "POST",
                body: JSON.stringify({ sectionId: String(section.index), response }),
            });
        } catch {
            // Non-critical — record locally even if network call fails
        } finally {
            setSectionChecks((prev) => ({ ...prev, [section.index]: response }));
            setCheckingSection(null);
        }
    }

    async function handleComplete() {
        setIsCompleting(true);
        setCompleteError(null);
        try {
            const result = await browserApiFetch<PostLessonContent>(
                ROUTES.LESSONS.COMPLETE(lesson.id),
                { method: "POST" },
            );
            router.push(`/learn/${result.lessonId}/complete?xp=${result.xpEarned}`);
        } catch (e) {
            setCompleteError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
            setIsCompleting(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-32">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Badge tone="primary">{lesson.subject}</Badge>
                    <Badge tone="muted">{lesson.depth}</Badge>
                    <span className="ml-auto text-sm text-text-secondary">~{lesson.estimatedReadTime} min read</span>
                </div>
                <h1 className="text-3xl font-semibold text-text-primary">{lesson.topic}</h1>
                <div className="flex items-center gap-3">
                    <Progress className="flex-1" value={progressPct} />
                    <span className="whitespace-nowrap text-xs text-text-secondary">
                        {answeredCount}/{totalSections} sections
                    </span>
                </div>
            </div>

            {/* Sections */}
            {lesson.sections.map((section) => {
                const checked = sectionChecks[section.index] ?? null;
                const isLoading = checkingSection === section.index;
                return (
                    <Card key={section.index}>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{SECTION_ICONS[section.type] ?? "📝"}</span>
                                <Badge tone="muted">{section.type}</Badge>
                            </div>
                            <CardTitle className="mt-1 text-xl">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="leading-7 text-text-secondary">{section.content}</p>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-3">
                            <p className="text-sm font-medium text-text-primary">How did that land?</p>
                            <div className="flex flex-wrap gap-2">
                                {CHECK_OPTIONS.map((opt) => (
                                    <Button
                                        className={checked === opt.value ? "ring-2 ring-primary-400 ring-offset-1" : ""}
                                        disabled={isLoading}
                                        key={opt.value}
                                        onClick={() => void handleSectionCheck(section, opt.value)}
                                        size="sm"
                                        variant={checked === opt.value ? "default" : "secondary"}
                                    >
                                        <span className="mr-1.5">{opt.emoji}</span>
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </CardFooter>
                    </Card>
                );
            })}

            {/* Recap */}
            {lesson.recap.length > 0 && (
                <Card className="border-primary-100 bg-primary-50/40">
                    <CardHeader>
                        <CardTitle className="text-lg text-primary-700">Key takeaways</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {lesson.recap.map((point, i) => (
                                <li className="flex items-start gap-2 text-sm leading-6 text-text-secondary" key={i}>
                                    <span className="mt-0.5 shrink-0 text-primary-500">•</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Complete footer */}
            {completeError && <p className="text-sm text-red-600">{completeError}</p>}
            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
                    {!allChecked && (
                        <p className="text-sm text-text-secondary">
                            Check each section when ready
                        </p>
                    )}
                    <Button
                        className="ml-auto"
                        disabled={isCompleting}
                        onClick={() => void handleComplete()}
                        size="lg"
                    >
                        {isCompleting ? "Finishing…" : (allChecked ? "Finish lesson →" : "Finish anyway →")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

const [sectionChecks, setSectionChecks] = useState<SectionCheckState>({});
const [checkingSection, setCheckingSection] = useState<number | null>(null);
const [isCompleting, setIsCompleting] = useState(false);
const [completeError, setCompleteError] = useState<string | null>(null);

const answeredCount = Object.keys(sectionChecks).length;
const totalSections = lesson.sections.length;
const progressPct = Math.round((answeredCount / totalSections) * 100);
const allChecked = answeredCount === totalSections;

async function handleSectionCheck(section: LessonSection, response: SectionCheckResponse) {
    setCheckingSection(section.index);
    try {
        await browserApiFetch(ROUTES.LESSONS.SECTION_CHECK(lesson.id), {
            method: "POST",
            body: JSON.stringify({ sectionId: String(section.index), response }),
        });
        setSectionChecks((prev) => ({ ...prev, [section.index]: response }));
    } catch {
        // Non-critical — still record locally even if network call fails
        setSectionChecks((prev) => ({ ...prev, [section.index]: response }));
    } finally {
        setCheckingSection(null);
    }
}

async function handleComplete() {
    setIsCompleting(true);
    setCompleteError(null);
    try {
        const result = await browserApiFetch<PostLessonContent>(
            ROUTES.LESSONS.COMPLETE(lesson.id),
            { method: "POST" },
        );
        router.push(`/learn/${result.lessonId}/complete?xp=${result.xpEarned}`);
    } catch (e) {
        setCompleteError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        setIsCompleting(false);
    }
}

return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-32">
        {/* Header */}
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <Badge tone="primary">{lesson.subject}</Badge>
                <Badge tone="muted">{lesson.depth}</Badge>
                <span className="ml-auto text-sm text-text-secondary">~{lesson.estimatedReadTime} min read</span>
            </div>
            <h1 className="text-3xl font-semibold text-text-primary">{lesson.topic}</h1>
            <div className="flex items-center gap-3">
                <Progress className="flex-1" value={progressPct} />
                <span className="whitespace-nowrap text-xs text-text-secondary">
                    {answeredCount}/{totalSections} sections
                </span>
            </div>
        </div>

        {/* Sections */}
        {lesson.sections.map((section) => {
            const checked = sectionChecks[section.index] ?? null;
            const isLoading = checkingSection === section.index;
            return (
                <Card key={section.index}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{SECTION_ICONS[section.type] ?? "📝"}</span>
                            <Badge tone="muted">{section.type}</Badge>
                        </div>
                        <CardTitle className="mt-1 text-xl">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="leading-7 text-text-secondary">{section.content}</p>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-3">
                        <p className="text-sm font-medium text-text-primary">How did that land?</p>
                        <div className="flex flex-wrap gap-2">
                            {CHECK_OPTIONS.map((opt) => (
                                <Button
                                    className={checked === opt.value ? "ring-2 ring-primary-400 ring-offset-1" : ""}
                                    disabled={isLoading}
                                    key={opt.value}
                                    onClick={() => void handleSectionCheck(section, opt.value)}
                                    size="sm"
                                    variant={checked === opt.value ? "default" : "secondary"}
                                >
                                    <span className="mr-1.5">{opt.emoji}</span>
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </CardFooter>
                </Card>
            );
        })}

        {/* Recap */}
        {lesson.recap.length > 0 && (
            <Card className="border-primary-100 bg-primary-50/40">
                <CardHeader>
                    <CardTitle className="text-lg text-primary-700">Key takeaways</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {lesson.recap.map((point, i) => (
                            <li className="flex items-start gap-2 text-sm leading-6 text-text-secondary" key={i}>
                                <span className="mt-0.5 shrink-0 text-primary-500">•</span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}

        {/* Complete footer */}
        {completeError && <p className="text-sm text-red-600">{completeError}</p>}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
                {!allChecked && (
                    <p className="text-sm text-text-secondary">
                        Check each section when ready
                    </p>
                )}
                <Button
                    className="ml-auto"
                    disabled={isCompleting}
                    onClick={() => void handleComplete()}
                    size="lg"
                >
                    {isCompleting ? "Finishing…" : (allChecked ? "Finish lesson →" : "Finish anyway →")}
                </Button>
            </div>
        </div>
    </div>
);
}
