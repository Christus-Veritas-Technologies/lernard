"use client";

import { ROUTES } from "@lernard/routes";
import type { UserSubject } from "@lernard/shared-types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { browserApiFetch } from "@/lib/browser-api";

import { getErrorMessage } from "../settings-helpers";

interface AvailableSubject {
    id: string;
    name: string;
}

export default function SubjectsPage() {
    const [available, setAvailable] = useState<AvailableSubject[]>([]);
    const [selected, setSelected] = useState<UserSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        void load();
    }, []);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [all, mine] = await Promise.all([
                browserApiFetch<AvailableSubject[]>(ROUTES.SUBJECTS.LIST),
                browserApiFetch<UserSubject[]>(ROUTES.SUBJECTS.MINE),
            ]);
            setAvailable(all);
            setSelected(mine.slice().sort((a, b) => a.priorityIndex - b.priorityIndex));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    const unselected = useMemo(() => {
        const selectedIds = new Set(selected.map((s) => s.subjectId));
        return available.filter((s) => !selectedIds.has(s.id));
    }, [available, selected]);

    const filteredUnselected = search.trim()
        ? unselected.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        : unselected;

    async function addSubject(subjectId: string) {
        setSaving(subjectId);
        try {
            const next = await browserApiFetch<UserSubject[]>(ROUTES.SUBJECTS.ADD, {
                method: "POST",
                body: JSON.stringify({ subjectId }),
            });
            setSelected(next.slice().sort((a, b) => a.priorityIndex - b.priorityIndex));
            toast.success("Subject added.");
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(null);
        }
    }

    async function removeSubject(subjectId: string) {
        setSaving(subjectId);
        try {
            const next = await browserApiFetch<UserSubject[]>(ROUTES.SUBJECTS.REMOVE(subjectId), {
                method: "DELETE",
            });
            setSelected(next.slice().sort((a, b) => a.priorityIndex - b.priorityIndex));
            toast.success("Subject removed.");
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(null);
        }
    }

    async function moveSubject(subjectId: string, direction: "up" | "down") {
        const index = selected.findIndex((s) => s.subjectId === subjectId);
        if (index < 0) return;
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= selected.length) return;

        const reordered = [...selected] as UserSubject[];
        const tmp = reordered[index]!;
        reordered[index] = reordered[newIndex]!;
        reordered[newIndex] = tmp;
        setSelected(reordered);

        setSaving(subjectId);
        try {
            await browserApiFetch(ROUTES.SUBJECTS.REORDER, {
                method: "PATCH",
                body: JSON.stringify({ subjectIds: reordered.map((s) => s.subjectId) }),
            });
        } catch (err) {
            toast.error(getErrorMessage(err));
            void load();
        } finally {
            setSaving(null);
        }
    }

    if (loading) {
        return (
            <div className="grid gap-6">
                <div className="h-48 animate-pulse rounded-3xl bg-background-subtle" />
                <div className="h-64 animate-pulse rounded-3xl bg-background-subtle" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <Badge className="w-fit" tone="warning">Subjects failed to load</Badge>
                    <CardTitle>Could not load your subjects</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => void load()}>Try again</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="border-0 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_100%)] shadow-sm">
                <CardHeader>
                    <Badge className="w-fit" tone="cool">Subjects</Badge>
                    <CardTitle>Manage your learning stack</CardTitle>
                    <CardDescription>
                        Add, remove, and reorder your subjects. Lernard uses this to personalise lessons and practice exams.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your subjects</CardTitle>
                    <CardDescription>
                        {selected.length} subject{selected.length !== 1 ? "s" : ""} selected. Drag or use the arrows to reorder by priority.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {selected.length === 0 ? (
                        <p className="text-sm text-text-secondary">No subjects selected yet. Add some from the list below.</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {selected.map((subject, index) => (
                                <li
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
                                    key={subject.subjectId}
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">{subject.name}</p>
                                        <p className="text-xs text-text-secondary">Priority #{index + 1}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            disabled={saving === subject.subjectId || index === 0}
                                            onClick={() => void moveSubject(subject.subjectId, "up")}
                                            variant="secondary"
                                        >
                                            ↑
                                        </Button>
                                        <Button
                                            disabled={saving === subject.subjectId || index === selected.length - 1}
                                            onClick={() => void moveSubject(subject.subjectId, "down")}
                                            variant="secondary"
                                        >
                                            ↓
                                        </Button>
                                        <Button
                                            disabled={saving === subject.subjectId}
                                            onClick={() => void removeSubject(subject.subjectId)}
                                            variant="ghost"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add subjects</CardTitle>
                    <CardDescription>Browse all available subjects and add them to your stack.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Input
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search subjects"
                        value={search}
                    />
                    {filteredUnselected.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                            {search ? "No subjects match your search." : "You have added all available subjects."}
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {filteredUnselected.map((subject) => (
                                <li
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                                    key={subject.id}
                                >
                                    <p className="text-sm font-semibold text-text-primary">{subject.name}</p>
                                    <Button
                                        disabled={saving === subject.id}
                                        onClick={() => void addSubject(subject.id)}
                                    >
                                        Add
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
