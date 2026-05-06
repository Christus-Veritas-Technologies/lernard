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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagePayload } from "@/hooks/usePagePayload";
import { formatRelativeDate } from "@/lib/formatters";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" },
    },
};

export function GuardianHomePageClient() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<GuardianDashboardContent>(
        ROUTES.GUARDIAN.DASHBOARD_PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign in required</CardTitle>
                    <CardDescription>Guardian Home needs your active session.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="h-36 rounded-3xl bg-background-subtle" />
                <div className="h-36 rounded-3xl bg-background-subtle" />
                <div className="h-36 rounded-3xl bg-background-subtle" />
                <div className="h-36 rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Guardian Home unavailable</CardTitle>
                    <CardDescription>{error?.message ?? "Please try again."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const { content, permissions } = data;
    const childrenByStreak = [...content.children].sort((a, b) => b.streak - a.streak).slice(0, 6);

    return (
        <motion.div animate="visible" className="flex flex-col gap-5" initial="hidden" variants={containerVariants}>
            <motion.section variants={itemVariants}>
                <Card className="overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
                    <CardContent className="mt-0 flex flex-wrap items-start justify-between gap-5">
                        <div className="space-y-3">
                            <Badge className="w-fit" tone="cool">Guardian Home</Badge>
                            <div>
                                <CardTitle className="text-2xl sm:text-3xl">Household learning control center</CardTitle>
                                <CardDescription className="mt-2 max-w-2xl text-base">
                                    Track momentum across your students, spot who needs support, and jump straight into companion controls or child progress.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge tone="primary">{content.summary.childrenCount} linked students</Badge>
                                <Badge tone="success">{content.summary.activeThisWeek} active this week</Badge>
                                <Badge tone="warm">{content.summary.pendingInvites} pending invites</Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => router.push("/guardian")} variant="secondary">
                                Open guardian hub
                                <ArrowRight02Icon size={16} strokeWidth={1.8} />
                            </Button>
                            <Button onClick={() => router.push("/settings")} variant="secondary">
                                <Settings02Icon size={16} strokeWidth={1.8} />
                                Household settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.section>

            <motion.section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" variants={itemVariants}>
                <SummaryCard
                    label="Linked students"
                    subtitle="Under your Household"
                    tone="primary"
                    value={`${content.summary.childrenCount}`}
                />
                <SummaryCard
                    label="Active this week"
                    subtitle="Recently engaged learners"
                    tone="success"
                    value={`${content.summary.activeThisWeek}`}
                />
                <SummaryCard
                    label="Average streak"
                    subtitle="Across all linked students"
                    tone="cool"
                    value={`${content.summary.averageStreak} days`}
                />
                <SummaryCard
                    label="Pending invites"
                    subtitle="Awaiting acceptance"
                    tone="warm"
                    value={`${content.summary.pendingInvites}`}
                />
            </motion.section>

            <motion.section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]" variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle>Household momentum</CardTitle>
                        <CardDescription>
                            Snapshot by streak strength to quickly spot who needs a nudge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="rounded-2xl border border-border bg-background/60 p-4">
                            <div className="flex items-end gap-3">
                                {childrenByStreak.map((child) => (
                                    <div className="flex flex-1 flex-col items-center gap-2" key={child.studentId}>
                                        <div className="flex h-28 w-full items-end rounded-xl bg-background-subtle px-1.5 py-1.5">
                                            <div className={`w-full rounded-md bg-primary-500 ${getMomentumBarClass(child.streak)}`} />
                                        </div>
                                        <span className="line-clamp-1 text-[11px] text-text-tertiary">{child.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                        {content.children.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
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
                                                    {child.subjects.slice(0, 2).map((subject) => (
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
                                                        variant="secondary"
                                                    >
                                                        Progress
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
                        ) : (
                            <p className="text-sm leading-6 text-text-secondary">
                                No students linked yet. Send your first invite to start building a household view.
                            </p>
                        )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status lane</CardTitle>
                            <CardDescription>Invite and readiness signals that need your attention.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-text-primary">Invite pipeline</p>
                                    <Badge tone="warm">{content.pendingInvites.length}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">Awaiting acceptance</p>
                                <Progress className="mt-3" value={Math.min(content.pendingInvites.length * 22, 100)} />
                            </div>

                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-text-primary">Household readiness</p>
                                    <Badge tone="success">{content.summary.activeThisWeek}/{Math.max(content.summary.childrenCount, 1)}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">Students active this week</p>
                                <Progress
                                    className="mt-3"
                                    value={Math.round((content.summary.activeThisWeek / Math.max(content.summary.childrenCount, 1)) * 100)}
                                />
                            </div>

                            {content.pendingInvites.slice(0, 2).map((invite) => (
                                <div className="rounded-2xl border border-border bg-background/60 p-3" key={invite.id}>
                                    <p className="text-sm font-semibold text-text-primary">{invite.childEmail ?? `Invite code ${invite.code}`}</p>
                                    <p className="mt-1 text-xs text-text-secondary">{invite.status} • Sent {formatRelativeDate(invite.sentAt)}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Guardian actions</CardTitle>
                            <CardDescription>Direct actions for daily monitoring and controls.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button onClick={() => router.push("/guardian")} variant="secondary">
                                <UserGroupIcon size={16} strokeWidth={1.8} />
                                Manage household
                            </Button>
                            <Button onClick={() => router.push("/guardian")} variant="secondary">
                                <SchoolBell01Icon size={16} strokeWidth={1.8} />
                                Review child progress
                            </Button>
                            <Button onClick={() => router.push("/home")} variant="secondary">
                                <ChartBarLineIcon size={16} strokeWidth={1.8} />
                                Refresh dashboard view
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </motion.section>

            <motion.section variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle>Household feed</CardTitle>
                        <CardDescription>
                            Recent guardian-relevant events from linked students and invite flow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Detail</TableHead>
                                    <TableHead>When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {buildFeedRows(content).map((row, index) => (
                                    <TableRow key={`${row.label}-${index}`}>
                                        <TableCell className="font-semibold">{row.label}</TableCell>
                                        <TableCell>{row.detail}</TableCell>
                                        <TableCell>{row.when}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.section>
        </motion.div>
    );
}

function SummaryCard({
    label,
    value,
    subtitle,
    tone,
}: {
    label: string;
    value: string;
    subtitle: string;
    tone: "primary" | "cool" | "success" | "warm";
}) {
    return (
        <Card>
            <CardContent className="mt-0 space-y-3">
                <Badge className="w-fit" tone={tone}>{label}</Badge>
                <p className="text-2xl font-semibold text-text-primary">{value}</p>
                <p className="text-xs text-text-secondary">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function getStrengthTone(level: string): "success" | "warning" | "warm" {
    if (level === "strong") return "success";
    if (level === "developing") return "warning";
    return "warm";
}

function buildFeedRows(content: GuardianDashboardContent): Array<{ label: string; detail: string; when: string }> {
    const childRows = content.children.slice(0, 3).map((child) => ({
        label: `${child.name} progress updated`,
        detail: `${child.streak}-day streak • ${child.subjects.length} tracked subjects`,
        when: formatRelativeDate(child.lastActiveAt),
    }));

    const inviteRows = content.pendingInvites.slice(0, 2).map((invite) => ({
        label: invite.status,
        detail: invite.childEmail ?? `Invite code ${invite.code}`,
        when: formatRelativeDate(invite.sentAt),
    }));

    return [...childRows, ...inviteRows].slice(0, 5);
}

function getMomentumBarClass(streak: number): string {
    if (streak >= 7) return "h-24";
    if (streak >= 5) return "h-20";
    if (streak >= 3) return "h-16";
    if (streak >= 2) return "h-12";
    return "h-8";
}
