"use client";

import {
    Clock01Icon,
    MoreHorizontalCircle01Icon,
    RefreshIcon,
    Rocket01Icon,
    SchoolReportCardIcon,
    SignalMedium02Icon,
} from "hugeicons-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { QuizDashboardStats, QuizHistoryItem, QuizHistoryResponse } from "@lernard/shared-types";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { browserApiFetch } from "@/lib/browser-api";

import { QuizCreateForm } from "./QuizCreateForm";

const EMPTY_STATS: QuizDashboardStats = {
    quizzesThisMonth: 0,
    monthlyLimit: null,
    averageScoreThisMonth: null,
    quizzesInProgress: 0,
    growthAreasFlagged: 0,
    mostQuizzedSubject: null,
    mostCommonDifficulty: null,
};

export function QuizDashboardClient() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [stats, setStats] = useState<QuizDashboardStats>(EMPTY_STATS);
    const [history, setHistory] = useState<QuizHistoryItem[]>([]);
    const [historyCursor, setHistoryCursor] = useState<string | null>(null);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError(null);

        try {
            const [statsData, historyData] = await Promise.all([
                browserApiFetch<QuizDashboardStats>(ROUTES.QUIZZES.DASHBOARD_STATS),
                browserApiFetch<QuizHistoryResponse>(`${ROUTES.QUIZZES.HISTORY}?limit=8`),
            ]);

            setStats(statsData);
            setHistory(historyData.quizzes);
            setHistoryCursor(historyData.nextCursor);
            setHistoryHasMore(historyData.hasMore);
        } catch {
            setDashboardError("Could not load your quiz dashboard yet.");
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    async function loadMoreHistory() {
        if (!historyHasMore || !historyCursor || historyLoadingMore) return;

        setHistoryLoadingMore(true);
        try {
            const nextPage = await browserApiFetch<QuizHistoryResponse>(
                `${ROUTES.QUIZZES.HISTORY}?limit=8&cursor=${encodeURIComponent(historyCursor)}`,
            );
            setHistory((prev) => [...prev, ...nextPage.quizzes]);
            setHistoryCursor(nextPage.nextCursor);
            setHistoryHasMore(nextPage.hasMore);
        } finally {
            setHistoryLoadingMore(false);
        }
    }

    const monthlyUsageLabel =
        stats.monthlyLimit === null
            ? `${stats.quizzesThisMonth} quizzes this month`
            : `${stats.quizzesThisMonth} / ${stats.monthlyLimit} this month`;

    const avgScoreLabel =
        stats.averageScoreThisMonth === null
            ? "No completed quizzes"
            : `${stats.averageScoreThisMonth.toFixed(1)} / 10 average`;

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(145deg,#eff5ff_0%,#f9fbff_45%,#ffffff_100%)] shadow-[0_24px_70px_-42px_rgba(37,99,235,0.45)]">
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 flex-1">
                            <Badge className="w-fit" tone="cool">Quiz Dashboard</Badge>
                            <CardTitle className="text-2xl">Build momentum with targeted practice</CardTitle>
                            <CardDescription>
                                Track activity, revisit unfinished quizzes, and launch fresh practice from one place.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>Create new quiz</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Generate a new quiz</DialogTitle>
                                        <DialogDescription>
                                            Pick a source, choose your quiz length, then start immediately.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <QuizCreateForm
                                        onGenerated={() => {
                                            setDialogOpen(false);
                                            void loadDashboard();
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                            <Link href="/quiz/create">
                                <Button variant="secondary">Open full create page</Button>
                            </Link>
                            <Button className="px-3" onClick={() => void loadDashboard()} variant="ghost">
                                <RefreshIcon size={14} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardStatCard
                    icon={<Rocket01Icon size={20} className="text-orange-600" />}
                    label="Monthly activity"
                    value={dashboardLoading ? "..." : monthlyUsageLabel}
                    bgColor="bg-orange-50"
                    borderColor="border-orange-200"
                />
                <DashboardStatCard
                    icon={<SchoolReportCardIcon size={20} className="text-green-600" />}
                    label="Score trend"
                    value={dashboardLoading ? "..." : avgScoreLabel}
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                />
                <DashboardStatCard
                    icon={<Clock01Icon size={20} className="text-blue-600" />}
                    label="In progress"
                    value={dashboardLoading ? "..." : `${stats.quizzesInProgress} quiz${stats.quizzesInProgress === 1 ? "" : "zes"}`}
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                />
                <DashboardStatCard
                    icon={<SignalMedium02Icon size={20} className="text-purple-600" />}
                    label="Growth areas"
                    value={dashboardLoading ? "..." : `${stats.growthAreasFlagged}`}
                    bgColor="bg-purple-50"
                    borderColor="border-purple-200"
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Recent quiz history</CardTitle>
                    <CardDescription>
                        Every generated quiz appears here so you can resume, review, or retry quickly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {dashboardError ? (
                        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {dashboardError}
                        </p>
                    ) : null}

                    {history.length === 0 ? (
                        <p className="rounded-xl border border-border bg-background-subtle px-3 py-4 text-sm text-text-tertiary">
                            No quizzes yet. Use Create new quiz to start your first one.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Difficulty</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((item) => (
                                        <TableRow key={item.quizId}>
                                            <TableCell className="font-semibold">{item.topic}</TableCell>
                                            <TableCell>{item.subjectName}</TableCell>
                                            <TableCell>
                                                <span className="capitalize">{item.difficulty}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusTone(item.status)} tone="muted">
                                                    {statusLabel(item.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDate(item.updatedAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/quiz/${item.quizId}`}>
                                                    <Button variant="secondary">Open</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {historyHasMore ? (
                        <Button className="w-fit" onClick={() => void loadMoreHistory()} variant="secondary">
                            <MoreHorizontalCircle01Icon size={14} />
                            {historyLoadingMore ? "Loading..." : "Load more"}
                        </Button>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardStatCard({ icon, label, value, bgColor, borderColor }: { icon: ReactNode; label: string; value: string; bgColor: string; borderColor: string }) {
    return (
        <Card className={`border ${borderColor} ${bgColor}`}>
            <CardContent className="space-y-2 px-4 py-4">
                <div className="flex items-center gap-2.5">
                    {icon}
                    <p className="text-xs text-text-tertiary">{label}</p>
                </div>
                <p className="text-base font-semibold text-text-primary">{value}</p>
            </CardContent>
        </Card>
    );
}

function statusTone(status: QuizHistoryItem["status"]): string {
    if (status === "completed") return "bg-green-50 text-green-700";
    if (status === "in_progress") return "bg-blue-50 text-blue-700";
    if (status === "queued") return "bg-amber-50 text-amber-700";
    if (status === "failed") return "bg-red-50 text-red-700";
    return "bg-background-subtle text-text-secondary";
}

function statusLabel(status: QuizHistoryItem["status"]): string {
    if (status === "in_progress") return "In progress";
    if (status === "not_started") return "Not started";
    if (status === "queued") return "Queued";
    if (status === "failed") return "Failed";
    return "Completed";
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString();
}
