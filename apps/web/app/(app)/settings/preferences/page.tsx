"use client";

import { ROUTES } from "@lernard/routes";
import { Appearance, type SettingsContent, type UserSettings } from "@lernard/shared-types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";
import { usePagePayload } from "@/hooks/usePagePayload";

import { formatTokenLabel, getErrorMessage } from "../settings-helpers";

const APPEARANCE_OPTIONS = [
    {
        value: Appearance.LIGHT,
        label: "Light",
        description: "Keep everything bright and crisp.",
    },
    {
        value: Appearance.DARK,
        label: "Dark",
        description: "Reduce glare for late-night sessions.",
    },
    {
        value: Appearance.SYSTEM,
        label: "System",
        description: "Follow your device preference automatically.",
    },
] as const;

export default function PreferencesPage() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data?.content?.roleView === "student") {
            setSettings(data.content.settings);
        }
    }, [data]);

    if (!isAuthenticated) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warm">Sign in required</Badge>
                    <CardTitle>Preferences need your session</CardTitle>
                    <CardDescription>Sign in to edit appearance preferences.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="grid gap-6">
                <div className="h-48 animate-pulse rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">Failed to load</Badge>
                    <CardTitle>Preferences could not load</CardTitle>
                    <CardDescription>{error?.message ?? "Please retry."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refetch}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    const isLocked = data.content.roleView === "student" && data.content.lockedSettings.includes("appearance");

    return (
        <div className="flex flex-col gap-6">
            <Card className="border-0 bg-[linear-gradient(135deg,#f8faff_0%,#ffffff_100%)] shadow-sm">
                <CardHeader>
                    <Badge className="w-fit" tone="cool">Preferences</Badge>
                    <CardTitle>Tune how Lernard looks</CardTitle>
                    <CardDescription>
                        Match Lernard to your device or pin it to a specific look for longer study sessions.
                        Changes save instantly.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>
                        Current theme: <strong>{settings ? formatTokenLabel(settings.appearance) : "—"}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                    {APPEARANCE_OPTIONS.map(({ value, label, description }) => (
                        <button
                            className={[
                                "rounded-[28px] border px-4 py-5 text-left transition",
                                settings?.appearance === value
                                    ? "border-primary-500 bg-primary-50 shadow-[0_20px_60px_-40px_rgba(59,130,246,0.6)]"
                                    : "border-border bg-background hover:border-primary-200 hover:bg-background-subtle",
                                isLocked || saving ? "cursor-not-allowed opacity-60" : "",
                            ].join(" ")}
                            disabled={isLocked || saving || !settings}
                            key={value}
                            onClick={() => void updateAppearance(value)}
                            type="button"
                        >
                            <p className="text-sm font-semibold text-text-primary">{label}</p>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
                        </button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );

    async function updateAppearance(appearance: Appearance) {
        setSaving(true);
        setSettings((s) => s ? { ...s, appearance } : s);
        try {
            const nextSettings = await browserApiFetch<UserSettings>(ROUTES.SETTINGS.APPEARANCE, {
                method: "PATCH",
                body: JSON.stringify({ appearance }),
            });
            setSettings(nextSettings);
            toast.success(`Theme updated to ${formatTokenLabel(appearance)}.`);
        } catch (err) {
            setSettings((s) => s ? { ...s, appearance: s.appearance } : s);
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }
}
