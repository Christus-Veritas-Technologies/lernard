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
            delayChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: "easeOut" as const },
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
                <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#153b7a_0%,#1f5ea8_45%,#0f766e_100%)] text-white shadow-[0_24px_80px_-34px_rgba(15,118,110,0.55)]">
                    <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_300px] xl:items-start">
                        <div className="space-y-3">
                            <Badge className="w-fit bg-white/14 text-white" tone="muted">Guardian Home</Badge>
                            <div>
                                <CardTitle className="text-2xl text-white sm:text-3xl">Household learning control center</CardTitle>
                                <CardDescription className="mt-2 max-w-2xl text-base text-white/80">
                                    Track momentum across your students, spot who needs support, and jump straight into companion controls or child progress.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-white/14 text-white" tone="muted">{content.summary.childrenCount} linked students</Badge>
                                <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{content.summary.activeThisWeek} active this week</Badge>
                                <Badge className="bg-amber-100 text-amber-900" tone="muted">{content.summary.pendingInvites} pending invites</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => router.push("/guardian")}>
                                    Open guardian hub
                                    <ArrowRight02Icon size={16} strokeWidth={1.8} />
                                </Button>
                                <Button className="border-white/20 bg-white/10 text-white hover:bg-white/16" onClick={() => router.push("/settings")} variant="ghost">
                                    <Settings02Icon size={16} strokeWidth={1.8} />
                                    Household settings
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                            <div className="rounded-2xl bg-white/12 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Weekly pulse</p>
                                        <p className="mt-2 text-3xl font-semibold text-white">{content.summary.activeThisWeek}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/14 p-3 text-white">
                                        <ChartBarLineIcon size={20} strokeWidth={1.8} />
                                    </div>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-white/78">Students with live activity this week.</p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-4 text-text-primary">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Household rhythm</p>
                                        <p className="mt-2 text-base font-semibold">Average streak {content.summary.averageStreak} days</p>
                                    </div>
                                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                                        <UserGroupIcon size={20} strokeWidth={1.8} />
                                    </div>
                                </div>
                            </div>
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
                                                    >
                                                        Progress
                                                    </Button>
                                                    <Button
                                                        disabled={!can(permissions, "can_change_companion_controls", child.studentId)}
                                                        onClick={() => router.push(`/guardian/${child.studentId}/companion`)}
                                                        variant="ghost"
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
                    <Card className="border-0 bg-[linear-gradient(160deg,#eefbf6_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Status lane</CardTitle>
                            <CardDescription>Invite and readiness signals that need your attention.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-2xl border border-amber-100 bg-white/80 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-text-primary">Invite pipeline</p>
                                    <Badge tone="warm">{content.pendingInvites.length}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">Awaiting acceptance</p>
                                <Progress className="mt-3" value={Math.min(content.pendingInvites.length * 22, 100)} />
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
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
                                <div className="rounded-2xl border border-sky-100 bg-white/80 p-3" key={invite.id}>
                                    <p className="text-sm font-semibold text-text-primary">{invite.childEmail ?? `Invite code ${invite.code}`}</p>
                                    <p className="mt-1 text-xs text-text-secondary">{invite.status} • Sent {formatRelativeDate(invite.sentAt)}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-[linear-gradient(160deg,#eef2ff_0%,#ffffff_100%)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Guardian actions</CardTitle>
                            <CardDescription>Direct actions for daily monitoring and controls.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button onClick={() => router.push("/guardian")}>
                                <UserGroupIcon size={16} strokeWidth={1.8} />
                                Manage household
                            </Button>
                            <Button onClick={() => router.push("/guardian")} variant="secondary">
                                <SchoolBell01Icon size={16} strokeWidth={1.8} />
                                Review child progress
                            </Button>
                            <Button onClick={() => router.push("/home")} variant="ghost">
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
    const styles = {
        primary: {
            card: "border-0 bg-[linear-gradient(180deg,#eaf0ff_0%,#ffffff_100%)]",
            icon: "bg-primary-500 text-white",
            glyph: <UserGroupIcon size={18} strokeWidth={1.8} />,
        },
        cool: {
            card: "border-0 bg-[linear-gradient(180deg,#ebf8ff_0%,#ffffff_100%)]",
            icon: "bg-sky-100 text-sky-700",
            glyph: <ChartBarLineIcon size={18} strokeWidth={1.8} />,
        },
        success: {
            card: "border-0 bg-[linear-gradient(180deg,#ecfdf3_0%,#ffffff_100%)]",
            icon: "bg-success text-white",
            glyph: <SchoolBell01Icon size={18} strokeWidth={1.8} />,
        },
        warm: {
            card: "border-0 bg-[linear-gradient(180deg,#fff4e6_0%,#ffffff_100%)]",
            icon: "bg-warning text-white",
            glyph: <Settings02Icon size={18} strokeWidth={1.8} />,
        },
    } satisfies Record<typeof tone, { card: string; icon: string; glyph: React.ReactNode }>;

    return (
        <Card className={styles[tone].card}>
            <CardContent className="mt-0 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <Badge className="w-fit" tone={tone}>{label}</Badge>
                    <span className={`rounded-2xl p-3 ${styles[tone].icon}`}>{styles[tone].glyph}</span>
                </div>
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
