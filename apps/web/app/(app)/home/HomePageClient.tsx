"use client";

import { ArrowRight02Icon, Message01Icon, Settings02Icon } from "hugeicons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ROUTES } from "@lernard/routes";
import type { HomeContent, SlotContent } from "@lernard/shared-types";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePagePayload } from "@/hooks/usePagePayload";

export function HomePageClient() {
    const { data, error, isAuthenticated, loading, refetch } =
        usePagePayload<HomeContent>(ROUTES.HOME.PAYLOAD);
    const [chatPrompt, setChatPrompt] = useState("");

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Lernard needs your session before loading home.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) return <div className="h-72 rounded-3xl bg-background-subtle" />;

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Home unavailable right now</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, slots } = data;
    const initials = useMemo(() => getInitialsFromGreeting(content.greeting), [content.greeting]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm text-text-secondary">Your dashboard</p>
                        <h1 className="text-2xl font-semibold text-text-primary">{content.greeting}</h1>
                    </div>
                </div>
                <Link href="/settings">
                    <Button className="h-10 w-10 rounded-full p-0" variant="secondary">
                        <Settings02Icon size={18} strokeWidth={1.8} />
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="mt-0 flex flex-wrap items-center gap-6">
                    <DailyGoalRing completed={content.dailyGoalProgress} target={content.dailyGoalTarget} />
                    <div className="space-y-2">
                        <p className="text-base font-semibold text-text-primary">Daily goal</p>
                        <p className="text-sm text-text-secondary">
                            {content.dailyGoalProgress} of {content.dailyGoalTarget} sessions done
                        </p>
                        <Badge tone="success">
                            {content.streak} day{content.streak === 1 ? "" : "s"} streak
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <UrgentActionCard slot={slots.urgent_action ?? null} />

            {slots.primary_cta ? (
                <Button className="w-full">{readSlotText(slots.primary_cta, "title", "Continue learning")}</Button>
            ) : null}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text-primary">My Subjects</h2>
                <ScrollArea orientation="horizontal">
                    <div className="flex min-w-max gap-3 pb-2">
                        {content.subjects.map((subject) => {
                            const breakdown = content.subjectTopics.find(
                                (entry) => entry.subjectId === subject.subjectId,
                            );
                            const total =
                                (breakdown?.strongCount ?? 0)
                                + (breakdown?.developingCount ?? 0)
                                + (breakdown?.needsWorkCount ?? 0);
                            const score = Math.round(((breakdown?.strongCount ?? 0) / Math.max(total, 1)) * 100);

                            return (
                                <Link href={`/progress/${subject.subjectId}`} key={subject.subjectId}>
                                    <Card className="w-64 p-4 sm:w-72">
                                        <CardHeader className="gap-1 p-0">
                                            <CardTitle className="text-base">{subject.name}</CardTitle>
                                            <CardDescription>
                                                Last active {formatRelativeTime(subject.lastActiveAt)}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="mt-3 p-0">
                                            <Progress value={score} />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </ScrollArea>
            </section>

            {slots.streak_nudge ? (
                <Card className="border-primary-200 bg-primary-50">
                    <CardContent className="mt-0 flex items-center justify-between gap-3">
                        <p className="text-sm text-primary-700">
                            {readSlotText(
                                slots.streak_nudge,
                                "description",
                                "Stay consistent today to protect your streak.",
                            )}
                        </p>
                        <Button variant="ghost">Dismiss</Button>
                    </CardContent>
                </Card>
            ) : null}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text-primary">Recent Sessions</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    {content.recentSessions.map((session) => (
                        <Card key={session.id}>
                            <CardHeader className="p-0">
                                <div className="flex items-center justify-between gap-2">
                                    <Badge tone={session.type === "quiz" ? "warm" : "cool"}>
                                        {session.type === "quiz" ? "Quiz" : "Lesson"}
                                    </Badge>
                                    <span className="text-xs text-text-tertiary">
                                        {formatRelativeTime(session.completedAt)}
                                    </span>
                                </div>
                                <CardTitle className="mt-2 text-base">{session.topic}</CardTitle>
                                <CardDescription>{session.subjectName}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}

                    {content.recentSessions.length === 0 ? (
                        <Card className="md:col-span-3">
                            <CardContent className="mt-0 text-sm text-text-secondary">
                                No sessions yet. Start your first lesson to build momentum.
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Ask Lernard Anything</CardTitle>
                    <CardDescription>Get help instantly, then jump into chat.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            onChange={(event) => setChatPrompt(event.target.value)}
                            placeholder="Ask a question about your current topic"
                            value={chatPrompt}
                        />
                        <Link
                            className="sm:w-auto"
                            href={chatPrompt.trim() ? `/chat?q=${encodeURIComponent(chatPrompt.trim())}` : "/chat"}
                        >
                            <Button className="w-full sm:w-auto">
                                <Message01Icon size={16} strokeWidth={1.8} />
                                Open chat
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DailyGoalRing({ completed, target }: { completed: number; target: number }) {
    const size = 108;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(target > 0 ? completed / target : 0, 0), 1);
    const dash = progress * circumference;

    return (
        <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    fill="none"
                    r={radius}
                    stroke="#E6EBFA"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    fill="none"
                    r={radius}
                    stroke="#6478B8"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeLinecap="round"
                    strokeWidth={strokeWidth}
                />
            </svg>
            <div className="absolute text-center">
                <p className="text-lg font-semibold text-text-primary">{completed}</p>
                <p className="text-xs text-text-tertiary">of {target}</p>
            </div>
        </div>
    );
}

function UrgentActionCard({ slot }: { slot: SlotContent | null }) {
    if (!slot) return null;

    return (
        <Card className="border-accent-warm-300 bg-accent-warm-100/45">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle>{readSlotText(slot, "title", "Action needed")}</CardTitle>
                        <CardDescription>
                            {readSlotText(slot, "description", "You have a quick action waiting.")}
                        </CardDescription>
                    </div>
                    <Badge tone="warm">Urgent</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Button>
                    Open
                    <ArrowRight02Icon size={15} strokeWidth={1.8} />
                </Button>
            </CardContent>
        </Card>
    );
}

function getInitialsFromGreeting(greeting: string): string {
    const cleaned = greeting
        .replace("Good morning,", "")
        .replace("Good afternoon,", "")
        .replace("Good evening,", "")
        .replace(".", "")
        .trim();

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "L";
    if (parts.length === 1) return (parts[0] ?? "L").slice(0, 1).toUpperCase();
    const first = parts[0] ?? "L";
    const second = parts[1] ?? "L";
    return `${first[0] ?? "L"}${second[0] ?? "L"}`.toUpperCase();
}

function readSlotText(slot: SlotContent, key: string, fallback: string): string {
    const value = slot.data[key];
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatRelativeTime(value: string | null): string {
    if (!value) return "just now";

    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return "just now";

    const diffMs = Date.now() - then;
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
        const mins = Math.max(1, Math.floor(diffMs / minute));
        return `${mins}m ago`;
    }

    if (diffMs < day) {
        const hours = Math.floor(diffMs / hour);
        return `${hours}h ago`;
    }

    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
}
