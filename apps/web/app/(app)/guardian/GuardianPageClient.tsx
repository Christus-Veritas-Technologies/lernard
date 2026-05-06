"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type { GuardianDashboardContent } from "@lernard/shared-types";
import {
    ArrowRight02Icon,
    ChartBarLineIcon,
    SchoolBell01Icon,
    Settings02Icon,
    UserGroupIcon,
} from "hugeicons-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagePayload } from "@/hooks/usePagePayload";
import { formatRelativeDate } from "@/lib/formatters";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
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
        <motion.div animate="visible" className="flex flex-col gap-6" initial="hidden" variants={containerVariants}>
            <motion.section variants={itemVariants}>
                <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#102f68_0%,#1e4f97_45%,#0f766e_100%)] text-white shadow-[0_24px_80px_-34px_rgba(15,118,110,0.58)]">
                    <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px] xl:items-start">
                        <div className="space-y-4">
                            <Badge className="w-fit bg-white/14 text-white" tone="muted">Guardian hub</Badge>
                            <div>
                                <CardTitle className="text-3xl text-white">A calm overview of your household learning</CardTitle>
                                <CardDescription className="mt-2 max-w-2xl text-base text-white/80">
                                    Keep every child in view, spot who needs a nudge, and handle invites or companion controls without digging through settings.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-white/14 text-white" tone="muted">{content.summary.childrenCount} linked children</Badge>
                                <Badge className="bg-emerald-300/16 text-white" tone="muted">{content.summary.activeThisWeek} active this week</Badge>
                                <Badge className="bg-amber-300/18 text-white" tone="muted">Average streak {content.summary.averageStreak} days</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button className="bg-white text-sky-800 hover:bg-white/92">
                                    Invite child
                                    <ArrowRight02Icon size={16} strokeWidth={1.8} />
                                </Button>
                                <Button className="border-white/20 bg-white/10 text-white hover:bg-white/16" variant="ghost">
                                    Review pending invites
                                </Button>
                                <Button className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => router.push("/settings")} variant="ghost">
                                    <Settings02Icon size={16} strokeWidth={1.8} />
                                    Household settings
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                            <HubSnapshotCard
                                description="Students active in the last seven days"
                                icon={<ChartBarLineIcon size={20} strokeWidth={1.8} />}
                                tone="teal"
                                title="Weekly pulse"
                                value={`${content.summary.activeThisWeek}/${Math.max(content.summary.childrenCount, 1)}`}
                            />
                            <HubSnapshotCard
                                description="Invites still waiting to be claimed"
                                icon={<UserGroupIcon size={20} strokeWidth={1.8} />}
                                tone="white"
                                title="Invite queue"
                                value={`${content.summary.pendingInvites}`}
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.section>

            <motion.section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" variants={itemVariants}>
                <HouseholdStatCard description="Children connected to your Household" icon={<UserGroupIcon size={18} strokeWidth={1.8} />} label="Linked children" tone="primary" value={`${content.summary.childrenCount}`} />
                <HouseholdStatCard description="Students showing recent activity" icon={<SchoolBell01Icon size={18} strokeWidth={1.8} />} label="Active this week" tone="success" value={`${content.summary.activeThisWeek}`} />
                <HouseholdStatCard description="Average current streak across learners" icon={<ChartBarLineIcon size={18} strokeWidth={1.8} />} label="Average streak" tone="cool" value={`${content.summary.averageStreak} days`} />
                <HouseholdStatCard description="Invites still awaiting acceptance" icon={<Settings02Icon size={18} strokeWidth={1.8} />} label="Pending invites" tone="warm" value={`${content.summary.pendingInvites}`} />
            </motion.section>

            <motion.section className="grid gap-4 lg:grid-cols-3" variants={itemVariants}>
                <Card className="border-0 bg-[linear-gradient(160deg,#eef2ff_0%,#ffffff_100%)] shadow-sm">
                    <CardHeader>
                        <CardTitle>Invite a child</CardTitle>
                        <CardDescription>Create a fresh invite when you want to link another child account to your Household.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm leading-6 text-text-secondary">Use this when a learner already has their own login or email address.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button>Send invite</Button>
                            <Button variant="ghost">Copy invite code</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-[linear-gradient(160deg,#eff8ff_0%,#ffffff_100%)] shadow-sm">
                    <CardHeader>
                        <CardTitle>Review progress</CardTitle>
                        <CardDescription>Open any child profile to review Lernard&apos;s Read on You, recent sessions, and growth areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm leading-6 text-text-secondary">Best for checking progress before companion controls need changing.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => router.push("/guardian")}>Open overview</Button>
                            <Button onClick={() => router.push("/guardian")} variant="secondary">See all children</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 bg-[linear-gradient(160deg,#fff7ed_0%,#ffffff_100%)] shadow-sm">
                    <CardHeader>
                        <CardTitle>Change companion controls</CardTitle>
                        <CardDescription>Tighten or relax help settings per child so support matches the moment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm leading-6 text-text-secondary">Use this before homework-heavy weeks or revision sessions.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => router.push("/guardian")} variant="secondary">Adjust controls</Button>
                            <Button onClick={() => router.push("/settings")} variant="ghost">Review defaults</Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.section>

            <motion.section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle>Children overview</CardTitle>
                                <CardDescription>
                                    Quick reads on streaks, recent activity, and which subjects might need more support.
                                </CardDescription>
                            </div>
                            <Button variant="ghost">Sort by activity</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {content.children.length ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Child</TableHead>
                                            <TableHead>Last active</TableHead>
                                            <TableHead>Streak</TableHead>
                                            <TableHead>Strength mix</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {content.children.map((child) => (
                                            <TableRow key={child.studentId}>
                                                <TableCell className="font-semibold">{child.name}</TableCell>
                                                <TableCell>{formatRelativeDate(child.lastActiveAt)}</TableCell>
                                                <TableCell>{child.streak} days</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {child.subjects.slice(0, 3).map((subject) => (
                                                            <Badge key={`${child.studentId}-${subject.name}`} tone={getStrengthTone(subject.strengthLevel)}>
                                                                {subject.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            disabled={!can(permissions, "can_view_child_progress", child.studentId)}
                                                            onClick={() => router.push(`/guardian/${child.studentId}`)}
                                                        >
                                                            View child
                                                        </Button>
                                                        <Button
                                                            disabled={!can(permissions, "can_change_companion_controls", child.studentId)}
                                                            onClick={() => router.push(`/guardian/${child.studentId}/companion`)}
                                                            variant="secondary"
                                                        >
                                                            Controls
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm leading-6 text-text-secondary">
                                No linked children yet. When a guardian invite is accepted, each learner will appear here with real streaks, activity, and subject signals.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card className="border-0 bg-[linear-gradient(160deg,#eefbf6_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Household momentum</CardTitle>
                            <CardDescription>
                                A simple chart showing who has the strongest learning rhythm right now.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {buildMomentumItems(content).map((item) => (
                                <div className="space-y-2" key={item.label}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                        <span className="text-xs text-text-secondary">{item.trailing}</span>
                                    </div>
                                    <Progress value={item.value} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-[linear-gradient(160deg,#fff7ed_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Pending invites</CardTitle>
                            <CardDescription>
                                Create, monitor, and revoke invites without losing the current child overview.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {content.pendingInvites.length ? (
                                content.pendingInvites.map((invite) => (
                                    <div className="rounded-2xl border border-amber-100 bg-white/80 p-4" key={invite.id}>
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
                                                <Button variant="secondary">Resend</Button>
                                                <Button variant="ghost">Copy code</Button>
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
            </motion.section>
        </motion.div>
    );
}

function HouseholdStatCard({
    label,
    value,
    description,
    icon,
    tone,
}: {
    label: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    tone: "primary" | "cool" | "success" | "warm";
}) {
    const styles = {
        primary: {
            card: "border-0 bg-[linear-gradient(180deg,#eaf0ff_0%,#ffffff_100%)]",
            icon: "bg-primary-500 text-white",
        },
        cool: {
            card: "border-0 bg-[linear-gradient(180deg,#ebf8ff_0%,#ffffff_100%)]",
            icon: "bg-sky-100 text-sky-700",
        },
        success: {
            card: "border-0 bg-[linear-gradient(180deg,#ecfdf3_0%,#ffffff_100%)]",
            icon: "bg-success text-white",
        },
        warm: {
            card: "border-0 bg-[linear-gradient(180deg,#fff4e6_0%,#ffffff_100%)]",
            icon: "bg-warning text-white",
        },
    } satisfies Record<typeof tone, { card: string; icon: string }>;

    return (
        <Card className={styles[tone].card}>
            <CardContent className="mt-0 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <Badge className="w-fit" tone={tone}>{label}</Badge>
                    <span className={`rounded-2xl p-3 ${styles[tone].icon}`}>{icon}</span>
                </div>
                <p className="text-2xl font-semibold text-text-primary">{value}</p>
                <p className="text-xs text-text-secondary">{description}</p>
            </CardContent>
        </Card>
    );
}

function HubSnapshotCard({
    title,
    value,
    description,
    icon,
    tone,
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    tone: "teal" | "white";
}) {
    if (tone === "white") {
        return (
            <div className="rounded-2xl bg-white px-4 py-4 text-text-primary">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{title}</p>
                        <p className="mt-2 text-3xl font-semibold">{value}</p>
                    </div>
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">{icon}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white/12 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">{title}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className="rounded-2xl bg-white/14 p-3 text-white">{icon}</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/78">{description}</p>
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