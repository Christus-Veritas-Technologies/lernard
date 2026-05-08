"use client";

import { can } from "@lernard/auth-core";
import { ROUTES } from "@lernard/routes";
import type {
    GuardianManagedChildSettings,
    GuardianSettingsContent,
    GuardianViewerSummary,
    ScopedPermission,
} from "@lernard/shared-types";
import {
    ArrowRight02Icon,
    CheckmarkCircle01Icon,
    Delete02Icon,
    SchoolBell01Icon,
    Settings02Icon,
    UserGroupIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browserApiFetch } from "@/lib/browser-api";
import { formatRelativeDate } from "@/lib/formatters";

import {
    ensureCompanionControls,
    formatTokenLabel,
    getErrorMessage,
    getInitials,
} from "./settings-helpers";

interface GuardianSettingsPageClientProps {
    content: GuardianSettingsContent;
    permissions: ScopedPermission[];
}

export function GuardianSettingsPageClient({ content, permissions }: GuardianSettingsPageClientProps) {
    const [children, setChildren] = useState(content.children);
    const [viewer, setViewer] = useState(content.viewer);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [nameDraft, setNameDraft] = useState(content.viewer.name);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    useEffect(() => {
        setChildren(content.children);
        setViewer(content.viewer);
        setNameDraft(content.viewer.name);
    }, [content]);

    const selectedChild = useMemo(
        () => children.find((child) => child.studentId === selectedChildId) ?? null,
        [children, selectedChildId],
    );

    const activeThisWeek = children.filter((child) => {
        if (!child.lastActiveAt) return false;
        return Date.now() - new Date(child.lastActiveAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const guardianViewer = viewer as GuardianViewerSummary;

    return (
        <>
            <div className="flex flex-col gap-6">
                <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#123768_0%,#1f5ea8_46%,#0f766e_100%)] text-white shadow-[0_28px_90px_-40px_rgba(15,118,110,0.58)]">
                    <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px] xl:items-start">
                        <div className="space-y-4">
                            <Badge className="w-fit bg-white/14 text-white" tone="muted">Guardian settings</Badge>
                            <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold text-white">
                                    {getInitials(viewer.name)}
                                </div>
                                <div>
                                    <p className="text-sm text-white/72">Household controls for</p>
                                    <h1 className="text-2xl font-semibold text-white">{viewer.name}</h1>
                                </div>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-white/82">
                                Manage your profile, notification preferences, linked children, and account settings.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-white/14 text-white" tone="muted">{formatTokenLabel(viewer.plan)}</Badge>
                                <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{children.length} linked children</Badge>
                                <Badge className="bg-amber-100 text-amber-900" tone="muted">{activeThisWeek} active this week</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Link href="/guardian">
                                    <Button className="bg-white text-slate-900 hover:bg-slate-100">
                                        Open household hub
                                        <ArrowRight02Icon size={16} strokeWidth={1.8} />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                            <HeroMetric icon={UserGroupIcon} label="Linked children" value={String(children.length)} />
                            <HeroMetric icon={SchoolBell01Icon} label="Email" value={viewer.email ?? "No email on file"} />
                            <HeroMetric icon={Settings02Icon} label="Role" value={formatTokenLabel(viewer.role)} />
                        </div>
                    </CardContent>
                </Card>

                <Tabs className="flex flex-col gap-4" defaultValue="profile">
                    <TabsList className="flex flex-wrap gap-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="account">Account</TabsTrigger>
                    </TabsList>

                    {/* ── PROFILE TAB ── */}
                    <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your profile</CardTitle>
                                <CardDescription>Name saves on blur. Other fields save immediately.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary" htmlFor="guardian-name">
                                        Display name
                                    </label>
                                    <Input
                                        id="guardian-name"
                                        maxLength={50}
                                        onBlur={saveProfileName}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        value={nameDraft}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">Email</label>
                                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background-subtle px-4 py-3">
                                        <span className="text-sm text-text-secondary">{viewer.email ?? "No email on file"}</span>
                                        <span className="text-xs text-text-secondary">Change email →</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Contact preference</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["email", "push", "both"] as const).map((pref) => (
                                            <button
                                                className={[
                                                    "rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
                                                    guardianViewer.contactPreference === pref
                                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                                        : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                                ].join(" ")}
                                                disabled={savingField === "guardian-profile"}
                                                key={pref}
                                                onClick={() => saveGuardianProfileField("contactPreference", pref)}
                                                type="button"
                                            >
                                                {formatTokenLabel(pref)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-primary">Dashboard default</label>
                                    <div className="grid gap-2">
                                        {(["overview", "last_viewed", "most_recent"] as const).map((def) => (
                                            <button
                                                className={[
                                                    "rounded-2xl border px-3 py-3 text-left text-sm transition",
                                                    guardianViewer.dashboardDefault === def
                                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                                        : "border-border bg-background text-text-secondary hover:border-primary-200 hover:bg-background-subtle",
                                                ].join(" ")}
                                                disabled={savingField === "guardian-profile"}
                                                key={def}
                                                onClick={() => saveGuardianProfileField("dashboardDefault", def)}
                                                type="button"
                                            >
                                                {formatTokenLabel(def)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Children quick view</CardTitle>
                                <CardDescription>{children.length} linked · {activeThisWeek} active this week</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {children.length === 0 ? (
                                    <p className="text-sm text-text-secondary">No children linked yet.</p>
                                ) : (
                                    children.slice(0, 4).map((child) => (
                                        <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-3" key={child.studentId}>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{child.name}</p>
                                                <p className="text-xs text-text-secondary">Last active {formatRelativeDate(child.lastActiveAt)}</p>
                                            </div>
                                            <Badge tone="cool">{child.streak}d</Badge>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── NOTIFICATIONS TAB ── */}
                    <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>Account notifications</CardTitle>
                                <CardDescription>Guardian-level notification preferences.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-0 divide-y divide-border">
                                <ToggleRow
                                    checked={guardianViewer.weeklyFamilySummary}
                                    description="A weekly email summarising all children's activity."
                                    disabled={savingField === "guardian-notifications"}
                                    label="Weekly family summary"
                                    onCheckedChange={(v) => saveGuardianNotificationField("weeklyFamilySummary", v)}
                                />
                                <ToggleRow
                                    checked={guardianViewer.unsubscribeAll}
                                    description="Stop all non-essential emails from Lernard."
                                    disabled={savingField === "guardian-notifications"}
                                    label="Unsubscribe from all emails"
                                    onCheckedChange={(v) => saveGuardianNotificationField("unsubscribeAll", v)}
                                />
                            </CardContent>
                        </Card>

                        {children.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Per-child notifications</CardTitle>
                                    <CardDescription>Toggle notifications for individual children.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-0 divide-y divide-border">
                                    {children.map((child) => (
                                        <div className="flex items-center justify-between gap-3 py-3" key={child.studentId}>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{child.name}</p>
                                                <p className="text-xs text-text-secondary">
                                                    Notifications {child.settings.notificationsEnabled ? "enabled" : "disabled"}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={child.settings.notificationsEnabled}
                                                disabled={savingField === `child-notif:${child.studentId}`}
                                                onCheckedChange={(v) => saveChildNotification(child.studentId, v)}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ── ACCOUNT TAB ── */}
                    <TabsContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" value="account">
                        <div className="flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Household plan</CardTitle>
                                    <CardDescription>
                                        {viewer.plan === "household"
                                            ? "Household plan — up to 5 linked children."
                                            : `${formatTokenLabel(viewer.plan)} plan.`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {children.length > 0 && (
                                        <div className="space-y-2">
                                            {children.map((child) => (
                                                <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-3 text-sm" key={child.studentId}>
                                                    <span className="font-medium text-text-primary">{child.name}</span>
                                                    <span className="text-text-secondary">{child.streak} day streak</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        <Link href="/plans">
                                            <Button variant="secondary" size="sm">View plans</Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Children</CardTitle>
                                    <CardDescription>Manage and rename linked children.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {children.length === 0 ? (
                                        <p className="text-sm text-text-secondary">No children linked yet.</p>
                                    ) : (
                                        children.map((child) => {
                                            const canRenameChild = can(permissions, "can_edit_child_settings", child.studentId);
                                            return (
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3" key={child.studentId}>
                                                    <div>
                                                        <p className="text-sm font-medium text-text-primary">{child.name}</p>
                                                        <p className="text-xs text-text-secondary">{child.email ?? "No email"}</p>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger className="inline-flex min-h-9 items-center justify-center rounded-xl bg-surface px-3 py-1.5 text-sm font-medium text-text-primary ring-1 ring-inset ring-border transition hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
                                                            Actions
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>{child.name}</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                disabled={!canRenameChild}
                                                                onSelect={() => { setSelectedChildId(child.studentId); setRenameDraft(child.name); }}
                                                            >
                                                                Rename
                                                            </DropdownMenuItem>
                                                            {can(permissions, "can_change_companion_controls", child.studentId) && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/guardian/${child.studentId}/companion`}>
                                                                        Edit companion controls
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex flex-col gap-6">
                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-red-700">Delete guardian account</CardTitle>
                                    <CardDescription>
                                        Permanently removes your guardian account. Children will remain active but unlinked.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className="border-red-300 text-red-700 hover:bg-red-100"
                                        onClick={() => setShowDeleteDialog(true)}
                                        variant="secondary"
                                    >
                                        <Delete02Icon size={16} strokeWidth={1.8} />
                                        Delete guardian account
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <Button className="w-full" onClick={handleSignOut} variant="secondary">
                                        Sign out
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Rename child dialog */}
            <Dialog open={Boolean(selectedChild)} onOpenChange={(open) => { if (!open) { setSelectedChildId(null); setRenameDraft(""); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename child</DialogTitle>
                        <DialogDescription>Update the display name for {selectedChild?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary" htmlFor="child-rename-input">Child name</label>
                        <Input
                            id="child-rename-input"
                            maxLength={50}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            value={renameDraft}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => { setSelectedChildId(null); setRenameDraft(""); }} variant="secondary">Cancel</Button>
                        <Button
                            disabled={!selectedChild || !renameDraft.trim() || savingField === `rename:${selectedChild?.studentId}`}
                            onClick={submitRename}
                        >
                            Save name
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete account dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-700">Delete guardian account</DialogTitle>
                        <DialogDescription>
                            Type <span className="font-mono font-semibold">DELETE</span> to permanently remove your guardian account.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        maxLength={6}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="Type DELETE"
                        value={deleteConfirm}
                    />
                    <DialogFooter>
                        <Button onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }} variant="secondary">Cancel</Button>
                        <Button
                            className="border-red-300 bg-red-600 text-white hover:bg-red-700"
                            disabled={deleteConfirm !== "DELETE" || savingField === "delete"}
                            onClick={handleDeleteAccount}
                        >
                            Delete account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );

    // ── handlers ──

    async function saveProfileName() {
        if (nameDraft === viewer.name) return;
        setSavingField("guardian-profile-name");
        try {
            await browserApiFetch(ROUTES.GUARDIAN.SETTINGS_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({ name: nameDraft.trim() }),
            });
            setViewer((v) => ({ ...v, name: nameDraft.trim() }));
            toast.success("Name updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveGuardianProfileField(field: string, value: unknown) {
        setSavingField("guardian-profile");
        try {
            await browserApiFetch(ROUTES.GUARDIAN.SETTINGS_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            setViewer((v) => ({ ...v, [field]: value }));
            toast.success("Profile updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveGuardianNotificationField(field: string, value: unknown) {
        setSavingField("guardian-notifications");
        try {
            await browserApiFetch(ROUTES.GUARDIAN.SETTINGS_NOTIFICATIONS, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value }),
            });
            setViewer((v) => ({ ...v, [field]: value }));
            toast.success("Notification preference updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function saveChildNotification(childId: string, enabled: boolean) {
        setSavingField(`child-notif:${childId}`);
        try {
            await browserApiFetch(ROUTES.GUARDIAN.SETTINGS_NOTIFICATIONS, {
                method: "PATCH",
                body: JSON.stringify({ perChildAlerts: [{ childId, enabled }] }),
            });
            setChildren((curr) =>
                curr.map((c) =>
                    c.studentId === childId
                        ? { ...c, settings: { ...c.settings, notificationsEnabled: enabled } }
                        : c,
                ),
            );
            toast.success("Child notification preference updated.");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function submitRename() {
        if (!selectedChild) return;
        setSavingField(`rename:${selectedChild.studentId}`);
        try {
            const updated = await browserApiFetch<GuardianManagedChildSettings>(
                ROUTES.GUARDIAN.CHILD(selectedChild.studentId),
                { method: "PATCH", body: JSON.stringify({ name: renameDraft.trim() }) },
            );
            setChildren((curr) => curr.map((c) => c.studentId === updated.studentId ? updated : c));
            toast.success(`${updated.name} updated.`);
            setSelectedChildId(null);
            setRenameDraft("");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    }

    async function handleDeleteAccount() {
        setSavingField("delete");
        try {
            await browserApiFetch(ROUTES.SETTINGS.DELETE_ACCOUNT, { method: "DELETE", body: JSON.stringify({ password: "" }) });
            window.location.href = "/";
        } catch (error) {
            toast.error(getErrorMessage(error));
            setSavingField(null);
        }
    }

    async function handleSignOut() {
        try {
            await browserApiFetch(ROUTES.AUTH.LOGOUT, { method: "POST" });
        } catch {
            // ignore
        }
        window.location.href = "/";
    }
}

// ── sub-components ──

function HeroMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserGroupIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl bg-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white">
                    <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ToggleRow({
    checked,
    description,
    disabled,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    description: string;
    disabled: boolean;
    label: string;
    onCheckedChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 py-3">
            <div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </div>
    );
}

import {
    ArrowRight02Icon,
    CheckmarkCircle01Icon,
    SchoolBell01Icon,
    Settings02Icon,
    UserGroupIcon,
} from "hugeicons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browserApiFetch } from "@/lib/browser-api";
import { formatRelativeDate } from "@/lib/formatters";

import {
    ensureCompanionControls,
    formatTokenLabel,
    getErrorMessage,
} from "./settings-helpers";

interface GuardianSettingsPageClientProps {
    content: GuardianSettingsContent;
    permissions: ScopedPermission[];
}

export function GuardianSettingsPageClient({ content, permissions }: GuardianSettingsPageClientProps) {
    const [children, setChildren] = useState(content.children);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [savingField, setSavingField] = useState<string | null>(null);

    useEffect(() => {
        setChildren(content.children);
    }, [content]);

    const selectedChild = useMemo(
        () => children.find((child) => child.studentId === selectedChildId) ?? null,
        [children, selectedChildId],
    );

    const activeThisWeek = children.filter((child) => {
        if (!child.lastActiveAt) {
            return false;
        }

        const lastActive = new Date(child.lastActiveAt).getTime();
        return Date.now() - lastActive <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const openRenameDialog = (child: GuardianManagedChildSettings) => {
        setSelectedChildId(child.studentId);
        setRenameDraft(child.name);
    };

    const handleRenameDialogChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSelectedChildId(null);
            setRenameDraft("");
        }
    };

    const submitRename = async () => {
        if (!selectedChild) {
            return;
        }

        setSavingField(`rename:${selectedChild.studentId}`);

        try {
            const updatedChild = await browserApiFetch<GuardianManagedChildSettings>(ROUTES.GUARDIAN.CHILD(selectedChild.studentId), {
                method: "PATCH",
                body: JSON.stringify({ name: renameDraft.trim() }),
            });

            setChildren((current) => current.map((child) => child.studentId === updatedChild.studentId ? updatedChild : child));
            toast.success(`${updatedChild.name} is updated.`);
            handleRenameDialogChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingField(null);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-6">
                <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#123768_0%,#1f5ea8_46%,#0f766e_100%)] text-white shadow-[0_28px_90px_-40px_rgba(15,118,110,0.58)]">
                    <CardContent className="mt-0 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px] xl:items-start">
                        <div className="space-y-4">
                            <Badge className="w-fit bg-white/14 text-white" tone="muted">Guardian settings</Badge>
                            <div>
                                <p className="text-sm text-white/72">Household controls for</p>
                                <h1 className="text-2xl font-semibold text-white">{content.viewer.name}</h1>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-white/82">
                                Manage linked children, keep companion controls aligned, and make small account edits without leaving the household settings surface.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-white/14 text-white" tone="muted">{formatTokenLabel(content.viewer.plan)}</Badge>
                                <Badge className="bg-emerald-100 text-emerald-900" tone="muted">{children.length} linked children</Badge>
                                <Badge className="bg-amber-100 text-amber-900" tone="muted">{activeThisWeek} active this week</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Link href="/guardian">
                                    <Button className="bg-white text-slate-900 hover:bg-slate-100">
                                        Open household hub
                                        <ArrowRight02Icon size={16} strokeWidth={1.8} />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-[28px] border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                            <HeroMetric icon={UserGroupIcon} label="Linked children" value={String(children.length)} />
                            <HeroMetric icon={SchoolBell01Icon} label="Email" value={content.viewer.email ?? "No email on file"} />
                            <HeroMetric icon={Settings02Icon} label="Role" value={formatTokenLabel(content.viewer.role)} />
                        </div>
                    </CardContent>
                </Card>

                <Tabs className="flex flex-col gap-4" defaultValue="household">
                    <TabsList className="flex flex-wrap gap-2">
                        <TabsTrigger value="household">Household</TabsTrigger>
                        <TabsTrigger value="children">Children</TabsTrigger>
                        <TabsTrigger value="controls">Companion controls</TabsTrigger>
                    </TabsList>

                    <TabsContent className="grid gap-6 lg:grid-cols-3" value="household">
                        <Card>
                            <CardHeader>
                                <CardTitle>Household snapshot</CardTitle>
                                <CardDescription>
                                    A compact view of the linked children currently controlled by this guardian account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <SummaryBlock label="Linked children" value={String(children.length)} />
                                <SummaryBlock label="Active this week" value={String(activeThisWeek)} />
                                <SummaryBlock label="Editable child fields" value="Name only" />
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Household policy</CardTitle>
                                <CardDescription>
                                    Child edits stay intentionally narrow here: rename when needed, and manage companion controls without reopening each child profile.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <AlertTitle>Settings stay role-aware</AlertTitle>
                                    <AlertDescription>
                                        This page is driven by the settings payload itself, so the guardian experience loads from one route and one payload instead of stitching together extra account requests.
                                    </AlertDescription>
                                </Alert>

                                {children.length === 0 ? (
                                    <EmptyStateCard />
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {children.map((child) => (
                                            <div className="rounded-3xl border border-border bg-background px-4 py-4" key={child.studentId}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-text-primary">{child.name}</p>
                                                        <p className="mt-1 text-sm text-text-secondary">{child.email ?? "No email on file"}</p>
                                                    </div>
                                                    <Badge tone="cool">{child.streak} day streak</Badge>
                                                </div>
                                                <p className="mt-3 text-sm text-text-secondary">
                                                    Last active {formatRelativeDate(child.lastActiveAt)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent className="grid gap-6" value="children">
                        {children.length === 0 ? (
                            <EmptyStateCard />
                        ) : (
                            children.map((child) => {
                                const canRenameChild = can(permissions, "can_edit_child_settings", child.studentId);

                                return (
                                    <Card key={child.studentId}>
                                        <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <CardTitle>{child.name}</CardTitle>
                                                <CardDescription>
                                                    {child.email ?? "No email on file"} · Last active {formatRelativeDate(child.lastActiveAt)}
                                                </CardDescription>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary ring-1 ring-inset ring-border transition hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
                                                    Child actions
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>{child.name}</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        disabled={!canRenameChild}
                                                        onSelect={() => openRenameDialog(child)}
                                                    >
                                                        Rename child
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <ChildFactCard label="Learning mode" value={formatTokenLabel(child.settings.learningMode)} />
                                            <ChildFactCard label="Appearance" value={formatTokenLabel(child.settings.appearance)} />
                                            <ChildFactCard label="Daily goal" value={`${child.settings.dailyGoal} sessions`} />
                                            <ChildFactCard label="Reminders" value={child.settings.notificationsEnabled ? "Enabled" : "Muted"} />
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>

                    <TabsContent className="grid gap-6" value="controls">
                        {children.length === 0 ? (
                            <EmptyStateCard />
                        ) : (
                            children.map((child) => {
                                const controls = ensureCompanionControls(child.companionControls);
                                const canChangeControls = can(permissions, "can_change_companion_controls", child.studentId);

                                return (
                                    <Card key={child.studentId}>
                                        <CardHeader>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <CardTitle>{child.name}</CardTitle>
                                                    <CardDescription>
                                                        When enabled here, these companion controls stay locked on the child side until a guardian changes them again.
                                                    </CardDescription>
                                                </div>
                                                <Badge tone={controls.lockedByGuardian ? "primary" : "muted"}>
                                                    {controls.lockedByGuardian ? "Locked for child" : "Not locked"}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">Answer reveal</span>
                                                <span className="font-medium text-text-primary capitalize">
                                                    {controls.answerRevealTiming === "after_quiz" ? "After quiz passed" : "Immediately"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">Pass threshold</span>
                                                <span className="font-medium text-text-primary">
                                                    {Math.round(controls.quizPassThreshold * 100)}%
                                                </span>
                                            </div>
                                            {canChangeControls && (
                                                <Link
                                                    className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
                                                    href={`/guardian/${child.studentId}/companion`}
                                                >
                                                    Edit companion controls
                                                    <ArrowRight02Icon size={14} />
                                                </Link>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={Boolean(selectedChild)} onOpenChange={handleRenameDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename child</DialogTitle>
                        <DialogDescription>
                            Update the display name used across household surfaces. Names must be between 1 and 50 characters.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert variant="warning">
                        <AlertTitle>Small edit only</AlertTitle>
                        <AlertDescription>
                            This settings pass only exposes child renaming. Broader profile edits stay outside household settings for now.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary" htmlFor="child-rename-input">
                            Child name
                        </label>
                        <Input
                            id="child-rename-input"
                            maxLength={50}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            placeholder="Enter a new display name"
                            value={renameDraft}
                        />
                    </div>

                    <DialogFooter>
                        <Button onClick={() => handleRenameDialogChange(false)} type="button" variant="secondary">
                            Cancel
                        </Button>
                        <Button
                            disabled={!selectedChild || !renameDraft.trim() || savingField === `rename:${selectedChild?.studentId}`}
                            onClick={submitRename}
                            type="button"
                        >
                            Save name
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function HeroMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserGroupIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl bg-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white">
                    <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
        </div>
    );
}

function ChildFactCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl border border-border bg-background px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
        </div>
    );
}

function ToggleControlRow({
    checked,
    description,
    disabled,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    description: string;
    disabled: boolean;
    label: string;
    onCheckedChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 py-3">
            <div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </div>
    );
}

function EmptyStateCard() {
    return (
        <Card>
            <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                    <CheckmarkCircle01Icon size={24} strokeWidth={1.8} />
                </div>
                <CardTitle>No linked children yet</CardTitle>
                <CardDescription>
                    Once a child is linked to this guardian account, their household settings and companion controls will appear here.
                </CardDescription>
            </CardHeader>
        </Card>
    );
}