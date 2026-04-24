"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type { GuardianDashboardContent } from "@lernard/shared-types";
import { useRouter } from "next/navigation";

import { ActionCard } from "../../../components/dashboard/ActionCard";
import { PageHero } from "../../../components/dashboard/PageHero";
import { PerformanceList } from "../../../components/dashboard/PerformanceList";
import { StatCard } from "../../../components/dashboard/StatCard";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { usePagePayload } from "../../../hooks/usePagePayload";
import { formatRelativeDate } from "../../../lib/formatters";

function getStrengthTone(strengthLevel: string) {
    if (strengthLevel === "strong") {
        return "success" as const;
    }

    if (strengthLevel === "developing") {
        return "warning" as const;
    }

    return "warm" as const;
}

export function GuardianPageClient() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<GuardianDashboardContent>(
        ROUTES.GUARDIAN.DASHBOARD_PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">
                        Sign in required
                    </Badge>
                    <CardTitle>The Household dashboard needs your session</CardTitle>
                    <CardDescription>
                        Lernard can only load linked children and companion permissions after a guardian session is active.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="grid gap-6">
                <Card className="overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
                    <CardContent className="mt-0 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)] lg:items-start">
                        <div className="space-y-4">
                            <div className="h-4 w-28 rounded-full bg-background-subtle" />
                            <div className="h-10 w-2/3 rounded-2xl bg-background-subtle" />
                            <div className="h-24 w-full rounded-3xl bg-background-subtle" />
                        </div>
                        <div className="grid gap-4">
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                            <div className="h-36 rounded-3xl bg-background-subtle" />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="h-52 rounded-3xl bg-background-subtle" />
                    <div className="h-52 rounded-3xl bg-background-subtle" />
                    <div className="h-52 rounded-3xl bg-background-subtle" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">
                        Live payload failed
                    </Badge>
                    <CardTitle>Guardian could not load right now</CardTitle>
                    <CardDescription>
                        {error?.message ?? "Something interrupted the API request."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, permissions } = data;

    return (
        <div className="flex flex-col gap-6">
            <PageHero
                aside={
                    <>
                        <StatCard
                            detail="Every linked child has checked in this week."
                            eyebrow="This week"
                            label="Active learners"
                            tone="success"
                            value={`${content.summary.activeThisWeek}/${content.summary.childrenCount}`}
                        />
                        <StatCard
                            detail="Pending invites are kept separate so account management stays tidy."
                            eyebrow="Household"
                            label="Pending invites"
                            tone="warm"
                            value={`${content.summary.pendingInvites}`}
                        />
                    </>
                }
                description="Keep every child in view, spot who needs a nudge, and handle invites or companion controls without digging through settings."
                eyebrow="Guardian hub"
                title="A calm overview of your household learning"
            >
                <Badge tone="primary">{content.summary.childrenCount} linked children</Badge>
                <Badge tone="cool">Average streak {content.summary.averageStreak} days</Badge>
                <Button>Invite child</Button>
                <Button variant="secondary">Review pending invites</Button>
            </PageHero>

            <section className="grid gap-4 lg:grid-cols-3">
                <ActionCard
                    description="Create a fresh invite when you want to link another child account to your Household."
                    detail="Use this when a learner already has their own login or email address."
                    eyebrow="Create"
                    primaryAction="Send invite"
                    secondaryAction="Copy invite code"
                    title="Invite a child"
                />
                <ActionCard
                    description="Open any child profile to review Lernard's Read on You, recent sessions, and growth areas."
                    detail="Best for checking progress before companion controls need changing."
                    eyebrow="Read"
                    primaryAction="Open overview"
                    secondaryAction="See all children"
                    title="Review progress"
                />
                <ActionCard
                    description="Tighten or relax help settings per child so support matches the moment."
                    detail="Use this before homework-heavy weeks or revision sessions."
                    eyebrow="Update"
                    primaryAction="Adjust controls"
                    secondaryAction="Review defaults"
                    title="Change companion controls"
                />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle>Children overview</CardTitle>
                                <CardDescription>
                                    Quick reads on streaks, recent activity, and which subjects might need more support.
                                </CardDescription>
                            </div>
                            <Button variant="secondary">Sort by activity</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {content.children.length ? (
                            content.children.map((child) => (
                                <div className="rounded-3xl border border-border bg-background/70 p-5" key={child.studentId}>
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-lg font-semibold text-text-primary">{child.name}</p>
                                                <p className="text-sm text-text-secondary">
                                                    Last active {formatRelativeDate(child.lastActiveAt)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge tone="primary">{child.streak}-day streak</Badge>
                                                {child.subjects.map((subject) => (
                                                    <Badge
                                                        key={`${child.studentId}-${subject.name}`}
                                                        tone={getStrengthTone(subject.strengthLevel)}
                                                    >
                                                        {subject.name}: {subject.strengthLevel.replace("_", " ")}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <Button
                                                disabled={!can(permissions, "can_view_child_progress", child.studentId)}
                                                onClick={() => router.push(`/guardian/${child.studentId}`)}
                                                variant="secondary"
                                            >
                                                View child
                                            </Button>
                                            <Button
                                                disabled={!can(permissions, "can_change_companion_controls", child.studentId)}
                                                onClick={() => router.push(`/guardian/${child.studentId}/companion`)}
                                                variant="secondary"
                                            >
                                                Companion controls
                                            </Button>
                                            <Button variant="danger">Remove</Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm leading-6 text-text-secondary">
                                No linked children yet. When a guardian invite is accepted, each learner will appear here with real streaks, activity, and subject signals.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Household momentum</CardTitle>
                            <CardDescription>
                                A simple chart showing who has the strongest learning rhythm right now.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PerformanceList items={buildMomentumItems(content)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Pending invites</CardTitle>
                            <CardDescription>
                                Create, monitor, and revoke invites without losing the current child overview.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {content.pendingInvites.length ? (
                                content.pendingInvites.map((invite) => (
                                    <div className="rounded-2xl border border-border bg-background/60 p-4" key={invite.id}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">
                                                    {invite.childEmail ?? `Invite code ${invite.code}`}
                                                </p>
                                                <p className="mt-1 text-sm text-text-secondary">
                                                    Sent {formatRelativeDate(invite.sentAt)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge tone="warm">{invite.status}</Badge>
                                                <Button variant="ghost">Resend</Button>
                                                <Button variant="danger">Cancel invite</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm leading-6 text-text-secondary">
                                    You don&apos;t have any pending invites right now.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function buildMomentumItems(content: GuardianDashboardContent) {
    if (!content.children.length) {
        return [
            {
                label: "Household momentum",
                value: 10,
                trailing: "Waiting for first linked child",
            },
        ];
    }

    return content.children.map((child) => ({
        label: child.name,
        value: Math.min(child.streak * 10, 100),
        trailing: `${child.streak}-day streak`,
    }));
}