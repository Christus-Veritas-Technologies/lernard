import type { Metadata } from "next";

import { ActionCard } from "../../../components/dashboard/ActionCard";
import { PageHero } from "../../../components/dashboard/PageHero";
import { PerformanceList } from "../../../components/dashboard/PerformanceList";
import { StatCard } from "../../../components/dashboard/StatCard";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { formatRelativeDate } from "../../../lib/formatters";
import {
    guardianDashboardContent,
    guardianSummary,
    pendingInvites,
} from "../../../lib/page-mock-data";

export const metadata: Metadata = {
    title: "Guardian — Lernard",
    description: "Manage linked children, pending invites, and companion controls from one dashboard.",
};

function getStrengthTone(strengthLevel: string) {
    if (strengthLevel === "strong") {
        return "success" as const;
    }

    if (strengthLevel === "developing") {
        return "warning" as const;
    }

    return "warm" as const;
}

export default function GuardianPage() {
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
                            value={`${guardianSummary.activeThisWeek}/${guardianSummary.childrenCount}`}
                        />
                        <StatCard
                            detail="Pending invites are kept separate so account management stays tidy."
                            eyebrow="Household"
                            label="Pending invites"
                            tone="warm"
                            value={`${guardianSummary.pendingInvites}`}
                        />
                    </>
                }
                description="Keep every child in view, spot who needs a nudge, and handle invites or companion controls without digging through settings."
                eyebrow="Guardian hub"
                title="A calm overview of your household learning"
            >
                <Badge tone="primary">{guardianSummary.childrenCount} linked children</Badge>
                <Badge tone="cool">Average streak {guardianSummary.averageStreak} days</Badge>
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
                        {guardianDashboardContent.children.map((child: (typeof guardianDashboardContent.children)[number]) => (
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
                                            {child.subjects.map((subject: (typeof child.subjects)[number]) => (
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
                                        <Button variant="secondary">View child</Button>
                                        <Button variant="secondary">Companion controls</Button>
                                        <Button variant="danger">Remove</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            <PerformanceList
                                items={guardianDashboardContent.children.map((child: (typeof guardianDashboardContent.children)[number]) => ({
                                    label: child.name,
                                    value: Math.min(child.streak * 10, 100),
                                    trailing: `${child.streak}-day streak`,
                                }))}
                            />
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
                            {pendingInvites.map((invite) => (
                                <div className="rounded-2xl border border-border bg-background/60 p-4" key={invite.id}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">
                                                {invite.childEmail}
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
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
