"use client";

import type { Metadata } from "next";
import { ROUTES } from "@lernard/routes";
import type { AuthUser } from "@lernard/shared-types";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { browserApiFetch } from "@/lib/browser-api";

export default function ProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        void browserApiFetch<AuthUser>(ROUTES.AUTH.ME).then(setUser).catch(() => null);
    }, []);

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await browserApiFetch<{ profilePictureUrl: string }>(ROUTES.SETTINGS.AVATAR_UPLOAD, {
                method: "POST",
                body: formData,
            });
            setUser((current) => current ? { ...current, profilePictureUrl: result.profilePictureUrl } : current);
        } catch {
            // silently ignore — user can retry
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const initials = user?.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() ?? "";

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-text-primary">Profile</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Profile picture</CardTitle>
                    <CardDescription>Upload a photo that represents you across Lernard.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                    <button
                        className="group relative shrink-0"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                    >
                        {user?.profilePictureUrl ? (
                            <img
                                alt={user.name}
                                className="h-20 w-20 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary-400"
                                src={user.profilePictureUrl}
                            />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-semibold text-primary-700 ring-2 ring-border transition group-hover:ring-primary-400">
                                {initials}
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <span className="text-xs font-semibold text-white">{uploading ? "Uploading…" : "Change"}</span>
                        </div>
                    </button>

                    <div className="space-y-2">
                        {user && (
                            <>
                                <p className="text-lg font-semibold text-text-primary">{user.name}</p>
                                <p className="text-sm text-text-secondary">{user.email ?? "No email on file"}</p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Badge tone="cool">{user.role}</Badge>
                                    <Badge tone="muted">{user.plan}</Badge>
                                </div>
                            </>
                        )}
                        <Button
                            className="mt-2"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            variant="secondary"
                        >
                            {uploading ? "Uploading…" : "Upload new photo"}
                        </Button>
                        <p className="text-xs text-text-secondary">JPEG, PNG, WEBP, or GIF. Max 5 MB.</p>
                    </div>

                    <input
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={onFileChange}
                        ref={fileInputRef}
                        type="file"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
