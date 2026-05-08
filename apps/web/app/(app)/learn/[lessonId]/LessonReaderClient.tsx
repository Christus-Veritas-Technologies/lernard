"use client";

import {
    ArrowLeft01Icon,
    BookOpen01Icon,
    Moon02Icon,
    Settings02Icon,
    SparklesIcon,
    SunCloud01Icon,
    SystemUpdate02Icon,
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { ROUTES } from "@lernard/routes";
import {
    getSubjectIcon,
    type LessonContent,
    type LessonSection,
    type LessonSectionType,
} from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { browserApiFetch } from "@/lib/browser-api";

interface LessonReaderClientProps {
    lessonId: string;
}

type LessonResponse = { status: "generating" | "ready"; content?: LessonContent };
type ConfidenceChoice = "got_it" | "not_sure" | "confused";
type ThemeMode = "light" | "dark" | "sepia";

const RESPONSE_OPTIONS: Array<{ key: ConfidenceChoice; label: string; activeClassName: string; hoverClassName: string }> = [
    { key: "got_it", label: "✓ Got it", activeClassName: "border-emerald-500 text-emerald-700 bg-emerald-50", hoverClassName: "hover:border-emerald-400 hover:bg-emerald-100" },
    { key: "not_sure", label: "~ Mostly", activeClassName: "border-amber-500 text-amber-700 bg-amber-50", hoverClassName: "hover:border-amber-400 hover:bg-amber-100" },
    { key: "confused", label: "? Not quite", activeClassName: "border-rose-500 text-rose-700 bg-rose-50", hoverClassName: "hover:border-rose-400 hover:bg-rose-100" },
];

const SECTION_STYLE: Record<LessonSectionType, { card: string; label: string }> = {
    hook: {
        card: "border-t-4 border-t-amber-500 bg-amber-50 border-amber-100",
        label: "text-amber-700",
    },
    concept: {
        card: "border-t-4 border-t-indigo-600 bg-indigo-50 border-indigo-100",
        label: "text-indigo-700",
    },
    examples: {
        card: "border-t-4 border-t-emerald-500 bg-emerald-50 border-emerald-100",
        label: "text-emerald-700",
    },
    recap: {
        card: "border-t-4 border-t-violet-600 bg-violet-50 border-violet-100",
        label: "text-violet-700",
    },
};

export function LessonReaderClient({ lessonId }: LessonReaderClientProps) {
    const router = useRouter();
    const [lesson, setLesson] = useState<LessonResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [textScale, setTextScale] = useState(100);
    const [theme, setTheme] = useState<ThemeMode>("light");
    const [currentSection, setCurrentSection] = useState(0);
    const [responses, setResponses] = useState<Record<number, ConfidenceChoice>>({});
    const [savingResponseFor, setSavingResponseFor] = useState<number | null>(null);
    const [reexplainLoadingFor, setReexplainLoadingFor] = useState<number | null>(null);
    const [sectionBodyOverrides, setSectionBodyOverrides] = useState<Record<number, string>>({});
    const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
    const sectionRefs = useRef<Array<HTMLElement | null>>([]);
    const startedAtRef = useRef<number>(Date.now());

    const loadLesson = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await browserApiFetch<LessonResponse>(ROUTES.LESSONS.GET(lessonId));
            setLesson(data);
            startedAtRef.current = Date.now();
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Unable to load lesson."));
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    useEffect(() => {
        void loadLesson();
    }, [loadLesson]);

    useEffect(() => {
        if (lesson?.status === "generating") {
            router.replace(`/learn/${lessonId}/loading`);
        }
    }, [lesson, lessonId, router]);

    useEffect(() => {
        const onScroll = () => {
            if (!lesson?.content) return;
            const nearest = sectionRefs.current
                .map((node, idx) => ({ idx, distance: node ? Math.abs(node.getBoundingClientRect().top - 170) : Number.MAX_SAFE_INTEGER }))
                .sort((a, b) => a.distance - b.distance)[0];

            if (nearest && nearest.idx !== currentSection) {
                setCurrentSection(nearest.idx);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [lesson, currentSection]);

    const content = lesson?.status === "ready" ? lesson.content : undefined;

    const sections = useMemo(() => {
        if (!content) return [];
        return content.sections.map((section, idx) => ({
            ...section,
            body: sectionBodyOverrides[idx] ?? section.body,
        }));
    }, [content, sectionBodyOverrides]);

    const elapsedMinutes = Math.floor((Date.now() - startedAtRef.current) / 60000);
    const remainingMinutes = Math.max(content?.estimatedMinutes ?? 0 - elapsedMinutes, 0);
    const isOverEstimatedTime = elapsedMinutes > (content?.estimatedMinutes ?? 0);
    const isFullyRead = sections.length > 0 && currentSection >= sections.length - 1;

    const onBack = () => {
        if (!isFullyRead) {
            const ok = window.confirm("Leave this lesson? Your progress won't be saved.");
            if (!ok) return;
        }
        router.push("/learn");
    };

    const submitSectionResponse = async (sectionIndex: number, response: ConfidenceChoice) => {
        setResponses((prev) => ({ ...prev, [sectionIndex]: response }));
        setSavingResponseFor(sectionIndex);
        try {
            await browserApiFetch(ROUTES.LESSONS.SECTION_CHECK(lessonId), {
                method: "POST",
                body: JSON.stringify({ response }),
            });
        } finally {
            setSavingResponseFor(null);
        }
    };

    const reexplainSection = async (sectionIndex: number) => {
        setReexplainLoadingFor(sectionIndex);
        try {
            const data = await browserApiFetch<{ sectionIndex: number; section: LessonSection }>(
                `${ROUTES.LESSONS.REEXPLAIN(lessonId)}?sectionIndex=${sectionIndex}`,
                { method: "POST" },
            );
            setSectionBodyOverrides((prev) => ({
                ...prev,
                [data.sectionIndex]: `### Another way to look at it\n\n${data.section.body}`,
            }));
        } finally {
            setReexplainLoadingFor(null);
        }
    };

    if (loading) {
        return <div className="h-80 rounded-3xl bg-background-subtle" />;
    }

    if (error || !lesson) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load lesson</CardTitle>
                    <CardDescription>{error?.message ?? "Try again."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={loadLesson}>Retry</Button>
                </CardContent>
            </Card>
        );
    }

    if (!content) {
        return null;
    }

    const subjectIconKey = getSubjectIcon(content.subjectName);

    return (
        <div className={`relative ${themeClassName(theme)}`}>
            <div className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur-sm dark:bg-slate-900/95">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
                    <button
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-slate-700"
                        onClick={onBack}
                        type="button"
                    >
                        <ArrowLeft01Icon size={16} strokeWidth={1.8} />
                    </button>

                    <Badge tone="cool">{content.subjectName}</Badge>

                    <Dialog>
                        <DialogTrigger asChild>
                            <button
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-slate-700"
                                type="button"
                            >
                                <Settings02Icon size={16} strokeWidth={1.8} />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="left-1/2 top-auto max-w-xl -translate-y-0 rounded-b-none rounded-t-3xl p-5 sm:w-[min(680px,95vw)]">
                            <DialogHeader>
                                <DialogTitle>Reader settings</DialogTitle>
                                <DialogDescription>Adjust readability while you study.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-900">Text size: A− A+</p>
                                    <input
                                        className="w-full"
                                        max={118}
                                        min={92}
                                        onChange={(event) => setTextScale(parseInt(event.target.value, 10))}
                                        step={2}
                                        type="range"
                                        value={textScale}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-900">Theme</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button className={`rounded-xl border px-3 py-2 text-sm ${theme === "light" ? "border-indigo-500 text-indigo-700" : "border-border"}`} onClick={() => setTheme("light")} type="button">
                                            <SunCloud01Icon className="mr-2 inline" size={14} strokeWidth={1.8} />
                                            Light
                                        </button>
                                        <button className={`rounded-xl border px-3 py-2 text-sm ${theme === "dark" ? "border-indigo-500 text-indigo-700" : "border-border"}`} onClick={() => setTheme("dark")} type="button">
                                            <Moon02Icon className="mr-2 inline" size={14} strokeWidth={1.8} />
                                            Dark
                                        </button>
                                        <button className={`rounded-xl border px-3 py-2 text-sm ${theme === "sepia" ? "border-indigo-500 text-indigo-700" : "border-border"}`} onClick={() => setTheme("sepia")} type="button">
                                            <SystemUpdate02Icon className="mr-2 inline" size={14} strokeWidth={1.8} />
                                            Sepia
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                    Read aloud (coming soon)
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 pb-3">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {sections.map((section, index) => {
                            const isDone = index < currentSection;
                            const isCurrent = index === currentSection;
                            return (
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" key={`${section.type}-${index}`}>
                                    <div
                                        className={`h-full ${isDone || isCurrent ? progressColorClass(section.type) : "bg-slate-200"} ${isCurrent ? "animate-pulse" : ""} ${isDone ? "w-full" : isCurrent ? "w-3/5" : "w-0"}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-right text-xs text-slate-500">
                        {Math.min(currentSection + 1, sections.length)} of {sections.length}
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 pb-36 pt-5">
                <div className="mb-5 rounded-2xl border border-border bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Lesson</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">{content.topic}</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {isOverEstimatedTime ? "You're almost done" : `~${content.estimatedMinutes} min read`} · {subjectIconLabel(subjectIconKey)}
                    </p>
                </div>

                <div className={`space-y-4 ${textScaleClassName(textScale)}`}>
                    {sections.map((section, index) => (
                        <section
                            className={`rounded-3xl border p-5 ${SECTION_STYLE[section.type].card}`}
                            key={`${section.type}-${index}`}
                            ref={(node) => {
                                sectionRefs.current[index] = node;
                            }}
                        >
                            <div className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] ${SECTION_STYLE[section.type].label}`}>
                                <SectionTypeIcon section={section.type} subjectKey={subjectIconKey} />
                                {sectionLabel(section.type, index)}
                            </div>

                            <h2 className={`${section.type === "hook" ? "font-serif text-3xl" : "text-2xl font-semibold"} text-slate-900`}>
                                {section.heading ?? sectionLabel(section.type, index)}
                            </h2>

                            <MarkdownSection body={section.body} section={section} />

                            {section.type !== "recap" && (
                                <div className="mt-6 border-t border-slate-200 pt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Before you move on...</p>
                                    <p className="mt-1 text-sm text-slate-800">Did this make sense?</p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        {RESPONSE_OPTIONS.map((option) => {
                                            const selected = responses[index] === option.key;
                                            return (
                                                <button
                                                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${selected ? option.activeClassName : `border-slate-300 text-slate-700 ${option.hoverClassName}`}`}
                                                    disabled={savingResponseFor === index}
                                                    key={option.key}
                                                    onClick={() => void submitSectionResponse(index, option.key)}
                                                    type="button"
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {responses[index] === "confused" && (
                                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-sm text-amber-900">
                                                That&apos;s fine. Want Lernard to try explaining it differently?
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <button
                                                    className="rounded-lg border border-amber-400 px-3 py-1.5 text-sm font-medium text-amber-800"
                                                    disabled={reexplainLoadingFor === index}
                                                    onClick={() => void reexplainSection(index)}
                                                    type="button"
                                                >
                                                    {reexplainLoadingFor === index ? "Rewriting..." : "Try a different explanation"}
                                                </button>
                                                <button
                                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                                                    onClick={() => setResponses((prev) => ({ ...prev, [index]: "not_sure" }))}
                                                    type="button"
                                                >
                                                    I&apos;ll keep going
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
                    <Button
                        className="flex-1"
                        onClick={() =>
                            router.push(
                                `/learn/${lessonId}/complete?topic=${encodeURIComponent(content.topic)}`,
                            )
                        }
                    >
                        {isFullyRead ? "Complete lesson" : "I\'m done"}
                    </Button>
                    <p className="min-w-[124px] text-right text-xs text-slate-500">
                        Estimated time remaining: ~{remainingMinutes} min
                    </p>
                </div>
            </div>
        </div>
    );
}

function MarkdownSection({ body, section }: { body: string; section: LessonSection }) {
    const decorated = useMemo(() => decorateBodyMarkdown(body, section.terms), [body, section.terms]);

    if (section.type === "recap") {
        return (
            <ul className="mt-4 space-y-2">
                {extractRecapBullets(decorated.markdown).map((bullet, index) => (
                    <li className="flex items-start gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-800" key={`${bullet}-${index}`}>
                        <span className="mt-1 h-2 w-2 rounded-full bg-violet-500" />
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className="lesson-markdown mt-4 text-slate-800">
            <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={{
                    h3: ({ children }) => <h3 className="mt-5 text-lg font-semibold text-slate-900">{children}</h3>,
                    p: ({ children }) => <p className="mt-3 leading-7">{children}</p>,
                    ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>,
                    ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="mt-3 border-l-4 border-indigo-300 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900">
                            {children}
                        </blockquote>
                    ),
                    code: ({ className, children, ...props }) => {
                        const content = String(children).replace(/\n$/, "");
                        const match = /language-(\w+)/.exec(className || "");
                        const language = match?.[1] ?? "text";
                        const isInline = !className;

                        if (isInline) {
                            return (
                                <code className="rounded bg-slate-200 px-1 py-0.5 text-[0.92em] text-slate-900" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
                                    <span>{language}</span>
                                    <button
                                        className="rounded border border-slate-600 px-2 py-1 text-[11px] transition-all hover:border-slate-500 hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                                        onClick={() => {
                                            const codeId = `code-${Date.now()}-${Math.random()}`;
                                            void navigator.clipboard.writeText(content);
                                            setCopiedCodeIndex(codeId);
                                            setTimeout(() => setCopiedCodeIndex(null), 2000);
                                        }}
                                        type="button"
                                    >
                                        {copiedCodeIndex && copiedCodeIndex.startsWith(`code-`) ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                                <pre className="overflow-x-auto p-3 text-sm text-slate-100">
                                    <code className={className} {...props}>{children}</code>
                                </pre>
                            </div>
                        );
                    },
                    a: ({ href, children }) => {
                        if (href?.startsWith("term://")) {
                            const token = href.replace("term://", "");
                            const explanation = decorated.termMap.get(token) ?? "";
                            return (
                                <span
                                    className="cursor-help border-b border-dashed border-amber-500 font-medium text-slate-900"
                                    title={explanation}
                                >
                                    {children}
                                </span>
                            );
                        }
                        return <a href={href}>{children}</a>;
                    },
                }}
            >
                {decorated.markdown}
            </ReactMarkdown>
        </div>
    );
}

function decorateBodyMarkdown(body: string, terms: LessonSection["terms"]) {
    const termMap = new Map<string, string>();
    let result = body;

    for (const term of terms) {
        const escaped = escapeRegex(term.term.trim());
        if (!escaped) continue;

        const token = encodeURIComponent(term.term.toLowerCase());
        const matcher = new RegExp(`\\b(${escaped})\\b`, "i");

        if (matcher.test(result)) {
            result = result.replace(matcher, `[$1](term://${token})`);
            termMap.set(token, term.explanation);
        }
    }

    return { markdown: result, termMap };
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function extractRecapBullets(markdown: string): string[] {
    const lines = markdown.split("\n").map((line) => line.trim());
    const bullets = lines
        .filter((line) => line.startsWith("- ") || line.startsWith("* "))
        .map((line) => line.replace(/^[-*]\s+/, "").trim())
        .filter(Boolean);

    if (bullets.length > 0) {
        return bullets;
    }

    return markdown
        .split(".")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function sectionLabel(type: LessonSectionType, index: number): string {
    if (type === "hook") return "WHY THIS MATTERS";
    if (type === "examples") return "WORKED EXAMPLE";
    if (type === "recap") return "QUICK RECAP";
    if (type === "concept" && index > 1) return "GOING DEEPER";
    return "THE CONCEPT";
}

function SectionTypeIcon({ section, subjectKey }: { section: LessonSectionType; subjectKey: ReturnType<typeof getSubjectIcon> }) {
    if (section === "hook") return <SparklesIcon size={14} strokeWidth={1.8} />;
    if (section === "examples") {
        return <span>{subjectGlyph(subjectKey)}</span>;
    }
    if (section === "recap") return <span>✓</span>;
    return <BookOpen01Icon size={14} strokeWidth={1.8} />;
}

function subjectGlyph(subjectKey: ReturnType<typeof getSubjectIcon>): string {
    if (subjectKey === "code") return "</>";
    if (subjectKey === "calculator") return "∑";
    if (subjectKey === "flask") return "⚗";
    if (subjectKey === "globe") return "◉";
    if (subjectKey === "book_text") return "Aa";
    if (subjectKey === "trending_up") return "↗";
    if (subjectKey === "languages") return "文";
    if (subjectKey === "music") return "♪";
    if (subjectKey === "palette") return "◍";
    return "✦";
}

function progressColorClass(type: LessonSectionType): string {
    if (type === "hook") return "bg-amber-500";
    if (type === "examples") return "bg-emerald-500";
    if (type === "recap") return "bg-violet-600";
    return "bg-indigo-600";
}

function subjectIconLabel(subjectIconKey: ReturnType<typeof getSubjectIcon>): string {
    if (subjectIconKey === "code") return "Programming";
    if (subjectIconKey === "calculator") return "Math";
    if (subjectIconKey === "flask") return "Science";
    if (subjectIconKey === "globe") return "Social studies";
    if (subjectIconKey === "book_text") return "Language";
    if (subjectIconKey === "trending_up") return "Business";
    if (subjectIconKey === "languages") return "Languages";
    if (subjectIconKey === "music") return "Music";
    if (subjectIconKey === "palette") return "Art & design";
    return "General";
}

function themeClassName(mode: ThemeMode): string {
    if (mode === "dark") return "bg-slate-950 text-slate-100";
    if (mode === "sepia") return "bg-amber-50 text-amber-950";
    return "bg-slate-50 text-slate-900";
}

function textScaleClassName(scale: number): string {
    if (scale <= 94) return "text-[0.93rem]";
    if (scale <= 100) return "text-[1rem]";
    if (scale <= 108) return "text-[1.05rem]";
    return "text-[1.1rem]";
}
