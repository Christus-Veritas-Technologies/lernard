"use client";

import {
    BookOpen01Icon,
    Cancel01Icon,
    ChartBarLineIcon,
    FireIcon,
    Reload01Icon,
    SchoolBell01Icon,
    SortByUp01Icon,
    Star01Icon,
} from "hugeicons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type {
    GrowthAreaItem,
    PaginatedHistoryResponse,
    PlanUsage,
    ProgressContent,
    ProgressSummary,
} from "@lernard/shared-types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateFilter = "7d" | "month" | "3m" | "all";
type TypeFilter = "all" | "lesson" | "quiz";
type SortOrder = "score_asc" | "last_attempted";

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgressPageClient() {
    const { data, error, isAuthenticated, loading, refetch } =
        usePagePayload<ProgressContent>(ROUTES.PROGRESS.OVERVIEW);

    const totalLessons = useMemo(
        () => data?.content.planUsage.lessonsUsed ?? 0,
        [data],
    );
    const totalQuizzes = useMemo(
        () => data?.content.planUsage.quizzesUsed ?? 0,
        [data],
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Your progress appears after signing in.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-48 rounded-xl bg-background-subtle animate-pulse" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-2xl bg-background-subtle animate-pulse" />
                    ))}
                </div>
                <div className="h-40 rounded-2xl bg-background-subtle animate-pulse" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load progress</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content } = data;
    const { planUsage, growthAreas, streak, xpLevel, xpPoints } = content;

    return (
        <div className="flex flex-col gap-6">
            {/* ─── Page heading ─────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-semibold text-text-primary">Your Progress</h1>
                <p className="mt-1 text-sm text-text-secondary">
                    Track streaks, strengths, and growth areas.
                </p>
            </div>

            {/* ─── Stats row ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile
                    icon={<FireIcon size={20} strokeWidth={1.8} />}
                    label="Streak"
                    value={streak === 0 ? "Start today!" : `${streak}d`}
                    tooltip={streak === 0 ? "Start your streak today — do one lesson!" : `${streak} day streak`}
                />
                <StatTile
                    icon={<ChartBarLineIcon size={20} strokeWidth={1.8} />}
                    label="XP Level"
                    value={`L${xpLevel}`}
                    tooltip={`${xpPoints} XP total`}
                />
                <StatTile
                    icon={<BookOpen01Icon size={20} strokeWidth={1.8} />}
                    label="Lessons"
                    value={totalLessons}
                />
                <StatTile
                    icon={<SchoolBell01Icon size={20} strokeWidth={1.8} />}
                    label="Quizzes"
                    value={totalQuizzes}
                />
            </div>

            {/* ─── Plan usage banner ────────────────────────────────── */}
            <PlanUsageBanner planUsage={planUsage} />

            {/* ─── Lernard's Read on You ────────────────────────────── */}
            {isAuthenticated && <ProgressSummaryCard planUsage={planUsage} />}

            {/* ─── Growth areas ─────────────────────────────────────── */}
            {growthAreas.length > 0 && (
                <GrowthAreasSection
                    initialGrowthAreas={growthAreas}
                    onDismiss={refetch}
                />
            )}

            {/* ─── Subjects + History tabs ──────────────────────────── */}
            <Tabs defaultValue="subjects">
                <TabsList>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects">
                    <SubjectsTab content={content} />
                </TabsContent>

                <TabsContent value="history">
                    <HistoryTab planUsage={planUsage} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

function StatTile({
    icon,
    label,
    value,
    tooltip,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    tooltip?: string;
}) {
    return (
        <div
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
            title={tooltip}
        >
            <div className="text-text-secondary">{icon}</div>
            <div className="text-xl font-bold text-text-primary">{value}</div>
            <div className="text-xs text-text-secondary">{label}</div>
        </div>
    );
}

// ─── PlanUsageBanner ─────────────────────────────────────────────────────────

function PlanUsageBanner({ planUsage }: { planUsage: PlanUsage }) {
    const lessonPct = planUsage.lessonsLimit > 0
        ? Math.round((planUsage.lessonsUsed / planUsage.lessonsLimit) * 100)
        : 0;
    const quizPct = planUsage.quizzesLimit > 0
        ? Math.round((planUsage.quizzesUsed / planUsage.quizzesLimit) * 100)
        : 0;

    const isExplorer = planUsage.plan === "explorer";
    const isAtLimit = lessonPct >= 100 || (planUsage.quizzesLimit > 0 && quizPct >= 100);
    const isNearing = !isAtLimit && (lessonPct >= 75 || quizPct >= 75);

    if (!isAtLimit && !isNearing && !isExplorer) return null;

    const resetDate = formatDate(planUsage.resetAt);

    return (
        <Card className={isAtLimit ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    {isAtLimit
                        ? isExplorer
                            ? "Daily lesson limit reached"
                            : "Monthly limit reached"
                        : isExplorer
                        ? "Daily usage"
                        : "Monthly usage"}
                </CardTitle>
                <CardDescription>
                    {isAtLimit
                        ? `Resets ${resetDate}.`
                        : isExplorer
                        ? `${planUsage.lessonsUsed} / ${planUsage.lessonsLimit} lessons today`
                        : `Resets ${resetDate}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <UsageBar
                    label="Lessons"
                    used={planUsage.lessonsUsed}
                    limit={planUsage.lessonsLimit}
                    pct={lessonPct}
                />
                {planUsage.quizzesLimit > 0 && (
                    <UsageBar
                        label="Quizzes"
                        used={planUsage.quizzesUsed}
                        limit={planUsage.quizzesLimit}
                        pct={quizPct}
                    />
                )}
                {isAtLimit && (
                    <Link href="/settings?tab=plan" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                        View plans
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}

function UsageBar({
    label,
    used,
    limit,
    pct,
}: {
    label: string;
    used: number;
    limit: number;
    pct: number;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-text-secondary">
                <span>{label}</span>
                <span>{used} / {limit}</span>
            </div>
            <Progress value={pct} className={pct >= 100 ? "[&>div]:bg-destructive" : pct >= 75 ? "[&>div]:bg-warning" : undefined} />
        </div>
    );
}

// ─── ProgressSummaryCard ──────────────────────────────────────────────────────

function ProgressSummaryCard({ planUsage }: { planUsage: PlanUsage }) {
    const [summary, setSummary] = useState<ProgressSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError(false);
        browserApiFetch<ProgressSummary | null>(ROUTES.PROGRESS.SUMMARY)
            .then((data) => {
                setSummary(data);
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }, []);

    useEffect(() => { load(); }, [load]);

    const isExplorer = planUsage.plan === "explorer";

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle>Lernard's Read on You</CardTitle>
                    <button
                        aria-label="Refresh summary"
                        className="rounded-lg p-1 text-text-secondary hover:bg-background-subtle"
                        onClick={load}
                    >
                        <Reload01Icon size={16} strokeWidth={2} />
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex flex-col gap-2">
                        <div className="h-4 w-full rounded bg-background-subtle animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-background-subtle animate-pulse" />
                    </div>
                ) : error || !summary ? (
                    <p className="text-sm text-text-secondary">
                        {error
                            ? "Couldn't load summary. Try refreshing."
                            : "Do a few more lessons to get your first read."}
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-text-secondary">{summary.summaryParagraph}</p>

                        {!isExplorer && summary.strengthTopic && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Strength
                                </span>
                                <p className="text-sm font-medium text-text-primary">
                                    {summary.strengthTopic}
                                </p>
                                {summary.strengthEvidence && (
                                    <p className="text-xs text-text-secondary">{summary.strengthEvidence}</p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Growth area
                            </span>
                            <p className="text-sm font-medium text-text-primary">{summary.gapTopic}</p>
                            {summary.gapEvidence && (
                                <p className="text-xs text-text-secondary">{summary.gapEvidence}</p>
                            )}
                        </div>

                        <Link
                            href={`/learn?topic=${encodeURIComponent(summary.nextActionTopic)}&subject=${encodeURIComponent(summary.nextActionSubject)}&depth=${summary.nextActionDepth}`}
                        >
                            <Button size="sm">
                                Start: {summary.nextActionTopic}
                            </Button>
                        </Link>

                        {isExplorer && (
                            <p className="text-xs text-text-secondary">
                                Upgrade to Scholar to unlock full strength analysis.{" "}
                                <Link href="/settings?tab=plan" className="text-primary underline-offset-2 hover:underline">
                                    View plans
                                </Link>
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── GrowthAreasSection ───────────────────────────────────────────────────────

function GrowthAreasSection({
    initialGrowthAreas,
    onDismiss,
}: {
    initialGrowthAreas: GrowthAreaItem[];
    onDismiss: () => void;
}) {
    const [areas, setAreas] = useState<GrowthAreaItem[]>(initialGrowthAreas);
    const [sortOrder, setSortOrder] = useState<SortOrder>("score_asc");
    const [dismissingKey, setDismissingKey] = useState<string | null>(null);

    const sorted = useMemo(() => {
        return [...areas].sort((a, b) => {
            if (sortOrder === "score_asc") return a.score - b.score;
            const aDate = a.lastAttemptedAt ? new Date(a.lastAttemptedAt).getTime() : 0;
            const bDate = b.lastAttemptedAt ? new Date(b.lastAttemptedAt).getTime() : 0;
            return aDate - bDate;
        });
    }, [areas, sortOrder]);

    const handleDismiss = useCallback(async (subjectId: string, topic: string) => {
        const key = `${subjectId}__${topic}`;
        setDismissingKey(key);
        try {
            await browserApiFetch(ROUTES.PROGRESS.DISMISS_GROWTH_AREA(subjectId, topic), {
                method: "DELETE",
            });
            setAreas((prev) => prev.filter((a) => !(a.subjectId === subjectId && a.topic === topic)));
            onDismiss();
        } catch {
            // silently ignore — item stays in list
        } finally {
            setDismissingKey(null);
        }
    }, [onDismiss]);

    if (areas.length === 0) return null;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Growth Areas</h2>
                <button
                    aria-label="Toggle sort order"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-background-subtle"
                    onClick={() =>
                        setSortOrder((prev) =>
                            prev === "score_asc" ? "last_attempted" : "score_asc",
                        )
                    }
                >
                    <SortByUp01Icon size={14} strokeWidth={2} />
                    {sortOrder === "score_asc" ? "Weakest first" : "Least recent first"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sorted.map((area) => {
                    const key = `${area.subjectId}__${area.topic}`;
                    return (
                        <GrowthAreaCard
                            key={key}
                            area={area}
                            dismissing={dismissingKey === key}
                            onDismiss={handleDismiss}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function GrowthAreaCard({
    area,
    dismissing,
    onDismiss,
}: {
    area: GrowthAreaItem;
    dismissing: boolean;
    onDismiss: (subjectId: string, topic: string) => Promise<void>;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <Card className="relative">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <Badge tone="default" className="mb-1 text-xs">
                            {area.subjectName}
                        </Badge>
                        <CardTitle className="text-base">{area.topic}</CardTitle>
                    </div>
                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <DialogTrigger asChild>
                            <button
                                aria-label="Dismiss growth area"
                                className="mt-0.5 rounded p-1 text-text-secondary hover:bg-background-subtle"
                            >
                                <Cancel01Icon size={14} strokeWidth={2} />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Dismiss growth area?</DialogTitle>
                                <DialogDescription>
                                    "{area.topic}" will be removed from your growth areas. It will reappear
                                    if your score drops below 60% again.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={dismissing}
                                    onClick={async () => {
                                        setConfirmOpen(false);
                                        await onDismiss(area.subjectId, area.topic);
                                    }}
                                >
                                    Dismiss
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <CardDescription className="text-xs">{area.flagReason}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Progress value={area.score} className="flex-1 [&>div]:bg-destructive" />
                    <span className="text-xs font-medium text-text-secondary">{area.score}%</span>
                </div>
                {area.lastAttemptedAt && (
                    <p className="text-xs text-text-secondary">
                        Last attempted {formatDate(area.lastAttemptedAt)}
                    </p>
                )}
                <div className="flex gap-2">
                    <Link
                        href={`/learn?topic=${encodeURIComponent(area.topic)}&subject=${encodeURIComponent(area.subjectName)}`}
                        className="flex-1"
                    >
                        <Button size="sm" variant="secondary" className="w-full">
                            <BookOpen01Icon size={14} strokeWidth={2} className="mr-1.5" />
                            Lesson
                        </Button>
                    </Link>
                    <Link
                        href={`/quiz?topic=${encodeURIComponent(area.topic)}&subject=${encodeURIComponent(area.subjectName)}`}
                        className="flex-1"
                    >
                        <Button size="sm" variant="secondary" className="w-full">
                            <SchoolBell01Icon size={14} strokeWidth={2} className="mr-1.5" />
                            Quiz
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── SubjectsTab ──────────────────────────────────────────────────────────────

function SubjectsTab({ content }: { content: ProgressContent }) {
    return (
        <div className="space-y-3 pt-4">
            {content.subjects.length === 0 ? (
                <p className="text-sm text-text-secondary">
                    Complete a few lessons to see your subject map.
                </p>
            ) : (
                content.subjects.map((subject) => {
                    const sessionCount = subject.topics.length;
                    const hasEnoughData = sessionCount >= 3;
                    const avg =
                        subject.topics.length > 0
                            ? Math.round(
                                  subject.topics.reduce((sum, t) => sum + t.score, 0) /
                                      subject.topics.length,
                              )
                            : 0;

                    const confident = subject.topics.filter((t) => t.level === "confident").length;
                    const gettingThere = subject.topics.filter((t) => t.level === "getting_there").length;
                    const needsWork = subject.topics.filter((t) => t.level === "needs_work").length;

                    return (
                        <Link href={`/progress/${subject.subjectId}`} key={subject.subjectId}>
                            <Card className="transition hover:shadow-md">
                                <CardHeader>
                                    <div className="flex items-center justify-between gap-3">
                                        <CardTitle className="text-base">{subject.subjectName}</CardTitle>
                                        {!hasEnoughData ? (
                                            <Badge tone="default">Not enough data</Badge>
                                        ) : needsWork > 0 ? (
                                            <Badge tone="warning">{needsWork} needs work</Badge>
                                        ) : (
                                            <Badge tone="success">On track</Badge>
                                        )}
                                    </div>
                                    <CardDescription>{subject.topics.length} topics tracked</CardDescription>
                                </CardHeader>
                                {hasEnoughData && (
                                    <CardContent className="flex flex-col gap-3">
                                        <Progress value={avg} />
                                        <div className="flex gap-3 text-xs text-text-secondary">
                                            <span className="text-green-600">{confident} confident</span>
                                            <span className="text-yellow-600">{gettingThere} getting there</span>
                                            <span className="text-red-600">{needsWork} needs work</span>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </Link>
                    );
                })
            )}
        </div>
    );
}

// ─── HistoryTab ───────────────────────────────────────────────────────────────

function HistoryTab({ planUsage }: { planUsage: PlanUsage }) {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [history, setHistory] = useState<PaginatedHistoryResponse | null>(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchHistory = useCallback(
        async (cursor?: string) => {
            const params = new URLSearchParams();
            if (typeFilter !== "all") params.set("type", typeFilter);
            if (dateFilter !== "all") params.set("dateFilter", dateFilter);
            if (cursor) params.set("cursor", cursor);
            const qs = params.toString();
            const url = qs ? `${ROUTES.PROGRESS.HISTORY}?${qs}` : ROUTES.PROGRESS.HISTORY;

            return browserApiFetch<PaginatedHistoryResponse>(url);
        },
        [typeFilter, dateFilter],
    );

    useEffect(() => {
        setHistoryLoading(true);
        fetchHistory()
            .then((data) => { if (mountedRef.current) { setHistory(data); setHistoryLoading(false); } })
            .catch(() => { if (mountedRef.current) { setHistory({ sessions: [], hasMore: false, nextCursor: null, historyCapDays: null }); setHistoryLoading(false); } });
    }, [fetchHistory]);

    const handleLoadMore = useCallback(async () => {
        if (!history?.nextCursor) return;
        setLoadingMore(true);
        try {
            const more = await fetchHistory(history.nextCursor);
            if (mountedRef.current) {
                setHistory((prev) =>
                    prev
                        ? { ...more, sessions: [...prev.sessions, ...more.sessions] }
                        : more,
                );
            }
        } catch {
            // silent
        } finally {
            if (mountedRef.current) setLoadingMore(false);
        }
    }, [history, fetchHistory]);

    const isExplorer = planUsage.plan === "explorer";

    return (
        <div className="flex flex-col gap-4 pt-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2">
                <select
                    aria-label="Filter by type"
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                >
                    <option value="all">All types</option>
                    <option value="lesson">Lessons</option>
                    <option value="quiz">Quizzes</option>
                </select>
                <select
                    aria-label="Filter by date"
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                    disabled={isExplorer}
                >
                    <option value="all">All time</option>
                    <option value="7d">Last 7 days</option>
                    <option value="month">Last month</option>
                    <option value="3m">Last 3 months</option>
                </select>
            </div>

            {isExplorer && (
                <p className="text-xs text-text-secondary">
                    Explorer plan shows the last 30 days.{" "}
                    <Link href="/settings?tab=plan" className="text-primary underline-offset-2 hover:underline">
                        Upgrade
                    </Link>{" "}
                    for full history.
                </p>
            )}

            {historyLoading ? (
                <div className="flex flex-col gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-2xl bg-background-subtle animate-pulse" />
                    ))}
                </div>
            ) : (history?.sessions.length ?? 0) === 0 ? (
                <p className="text-sm text-text-secondary">No sessions match your filters.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {history!.sessions.map((session) => (
                        <Card key={session.id}>
                            <CardContent className="flex items-center justify-between gap-3 py-3">
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-medium text-text-primary">{session.topic}</p>
                                    <p className="text-xs text-text-secondary">
                                        {session.subjectName} · {formatDate(session.completedAt)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {session.type === "lesson" && session.confidenceRating != null && (
                                        <ConfidenceStars rating={session.confidenceRating} />
                                    )}
                                    {session.type === "quiz" && session.score != null && session.scoreOutOf != null && (
                                        <ScoreBadge score={session.score} outOf={session.scoreOutOf} />
                                    )}
                                    <Badge tone="default" className="capitalize">
                                        {session.type}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {history?.hasMore && (
                        <Button
                            variant="secondary"
                            className="mt-2"
                            disabled={loadingMore}
                            onClick={handleLoadMore}
                        >
                            {loadingMore ? "Loading…" : "Load more"}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function ConfidenceStars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5" title={`Confidence: ${rating}/5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star01Icon
                    key={i}
                    size={12}
                    strokeWidth={2}
                    className={i <= rating ? "text-yellow-400" : "text-border"}
                />
            ))}
        </div>
    );
}

function ScoreBadge({ score, outOf }: { score: number; outOf: number }) {
    const pct = Math.round((score / outOf) * 100);
    const colorClass =
        pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";
    return (
        <span className={`text-xs font-semibold ${colorClass}`}>
            {score}/{outOf}
        </span>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
}


export function ProgressPageClient() {
    const { data, error, isAuthenticated, loading, refetch } =
        usePagePayload<ProgressContent>(ROUTES.PROGRESS.OVERVIEW);
    const [history, setHistory] = useState<PaginatedHistoryResponse | null>(null);
    const [historyTypeFilter, setHistoryTypeFilter] = useState<"all" | "lesson" | "quiz">("all");

    useEffect(() => {
        if (!isAuthenticated) return;

        const route =
            historyTypeFilter === "all"
                ? ROUTES.PROGRESS.HISTORY
                : `${ROUTES.PROGRESS.HISTORY}?type=${historyTypeFilter}`;

        void browserApiFetch<PaginatedHistoryResponse>(route)
            .then(setHistory)
            .catch(() => setHistory({ sessions: [], hasMore: false, nextCursor: null }));
    }, [historyTypeFilter, isAuthenticated]);

    const totalLessons = useMemo(
        () => history?.sessions.filter((session) => session.type === "lesson").length ?? 0,
        [history],
    );

    const totalQuizzes = useMemo(
        () => history?.sessions.filter((session) => session.type === "quiz").length ?? 0,
        [history],
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Your progress appears after signing in.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return <div className="h-72 rounded-3xl bg-background-subtle" />;
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Could not load progress</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, slots } = data;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold text-text-primary">Your Progress</h1>
                <p className="mt-1 text-sm text-text-secondary">Track streaks, strengths, and growth areas.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DashStatCard
                    icon={<FireIcon size={20} strokeWidth={1.8} />}
                    label="Streak"
                    value={`${content.streak}d`}
                />
                <DashStatCard
                    icon={<ChartBarLineIcon size={20} strokeWidth={1.8} />}
                    label="XP Level"
                    value={`L${content.xpLevel}`}
                />
                <DashStatCard
                    icon={<BookOpen01Icon size={20} strokeWidth={1.8} />}
                    label="Total Lessons"
                    value={totalLessons}
                />
                <DashStatCard
                    icon={<SchoolBell01Icon size={20} strokeWidth={1.8} />}
                    label="Total Quizzes"
                    value={totalQuizzes}
                />
            </div>

            {slots.lernard_summary_card ? (
                <Card className="bg-primary-50 border-primary-200">
                    <CardHeader>
                        <CardTitle>
                            {readSlot(slots.lernard_summary_card, "title", "Lernard's Read on You")}
                        </CardTitle>
                        <CardDescription>
                            {readSlot(
                                slots.lernard_summary_card,
                                "description",
                                "You are building momentum. Keep focusing on your growth areas.",
                            )}
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            <Tabs defaultValue="subjects">
                <TabsList>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects">
                    <div className="space-y-3">
                        {content.subjects.map((subject) => {
                            const avg =
                                subject.topics.length > 0
                                    ? Math.round(
                                          subject.topics.reduce((sum, topic) => sum + topic.score, 0)
                                              / subject.topics.length,
                                      )
                                    : 0;
                            const growthAreaCount = subject.topics.filter(
                                (topic) => topic.level === "needs_work",
                            ).length;

                            return (
                                <Link href={`/progress/${subject.subjectId}`} key={subject.subjectId}>
                                    <Card className="transition hover:shadow-md">
                                        <CardHeader>
                                            <div className="flex items-center justify-between gap-3">
                                                <CardTitle className="text-base">{subject.subjectName}</CardTitle>
                                                <Badge tone={growthAreaCount > 0 ? "warning" : "success"}>
                                                    {growthAreaCount} growth areas
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                {subject.topics.length} topics tracked
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Progress value={avg} />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}

                        {slots.growth_area_nudge ? (
                            <Card className="border-warning bg-warning-bg">
                                <CardContent className="mt-0 text-sm text-warning">
                                    {readSlot(
                                        slots.growth_area_nudge,
                                        "description",
                                        "Spend 10 minutes on a weaker topic today.",
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <CardTitle>Session History</CardTitle>
                                <select
                                    className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary"
                                    onChange={(event) =>
                                        setHistoryTypeFilter(
                                            event.target.value as "all" | "lesson" | "quiz",
                                        )
                                    }
                                    value={historyTypeFilter}
                                >
                                    <option value="all">All types</option>
                                    <option value="lesson">Lessons</option>
                                    <option value="quiz">Quizzes</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Duration</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(history?.sessions ?? []).map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>{formatDate(session.completedAt)}</TableCell>
                                            <TableCell className="capitalize">{session.type}</TableCell>
                                            <TableCell>{session.subjectName}</TableCell>
                                            <TableCell>{session.topic}</TableCell>
                                            <TableCell>{session.durationMinutes}m</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {history?.hasMore ? (
                                <Button className="mt-4" variant="secondary">
                                    Load more
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function readSlot(
    slot: { type: string; data: Record<string, unknown> },
    key: string,
    fallback: string,
): string {
    const value = slot.data[key];
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
}
