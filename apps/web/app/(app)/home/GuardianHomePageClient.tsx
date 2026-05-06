"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type { GuardianDashboardContent } from "@lernard/shared-types";
import { ArrowRight02Icon, SchoolBell01Icon, UserGroupIcon } from "hugeicons-react";
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

    return (
        <motion.div animate="visible" className="flex flex-col gap-6" initial="hidden" variants={containerVariants}>
            <motion.section variants={itemVariants}>
                <Card className="bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]">
                    <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <Badge className="mb-3 w-fit" tone="cool">Guardian Home</Badge>
                                <CardTitle className="text-2xl sm:text-3xl">Household learning at a glance</CardTitle>
                                <CardDescription className="mt-2 max-w-2xl text-base">
                                    Track each learner&apos;s momentum, quickly open child progress, and manage household actions without switching pages.
                                </CardDescription>
                            </div>
                            <Button onClick={() => router.push("/guardian")} variant="secondary">
                                Open detailed guardian hub
                                <ArrowRight02Icon size={16} strokeWidth={1.8} />
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
            </motion.section>

            <motion.section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" variants={itemVariants}>
                <SummaryCard label="Linked students" tone="primary" value={`${content.summary.childrenCount}`} />
                <SummaryCard label="Active this week" tone="success" value={`${content.summary.activeThisWeek}`} />
                <SummaryCard label="Average streak" tone="cool" value={`${content.summary.averageStreak} days`} />
                <SummaryCard label="Pending invites" tone="warm" value={`${content.summary.pendingInvites}`} />
            </motion.section>

            <motion.section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]" variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle>Students overview</CardTitle>
                        <CardDescription>
                            Quick household scan for activity, streak, and subject coverage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {content.children.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Last active</TableHead>
                                        <TableHead>Streak</TableHead>
                                        <TableHead>Subjects</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {content.children.map((child) => (
                                        <TableRow key={child.studentId}>
                                            <TableCell className="font-semibold">{child.name}</TableCell>
                                            <TableCell>{formatRelativeDate(child.lastActiveAt)}</TableCell>
                                            <TableCell>{child.streak} days</TableCell>
                                            <TableCell>{child.subjects.length}</TableCell>
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
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending invites</CardTitle>
                            <CardDescription>Review invite status for your household.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {content.pendingInvites.length ? content.pendingInvites.slice(0, 4).map((invite) => (
                                <div className="rounded-2xl border border-border bg-background/60 p-3" key={invite.id}>
                                    <p className="text-sm font-semibold text-text-primary">
                                        {invite.childEmail ?? `Invite code ${invite.code}`}
                                    </p>
                                    <p className="mt-1 text-xs text-text-secondary">
                                        {invite.status} • Sent {formatRelativeDate(invite.sentAt)}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-sm text-text-secondary">No pending invites.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Household actions</CardTitle>
                            <CardDescription>Jump to the right place quickly.</CardDescription>
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
                        </CardContent>
                    </Card>
                </div>
            </motion.section>
        </motion.div>
    );
}

function SummaryCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "primary" | "cool" | "success" | "warm";
}) {
    return (
        <Card>
            <CardContent className="mt-0 space-y-2">
                <Badge className="w-fit" tone={tone}>{label}</Badge>
                <p className="text-2xl font-semibold text-text-primary">{value}</p>
            </CardContent>
        </Card>
    );
}
