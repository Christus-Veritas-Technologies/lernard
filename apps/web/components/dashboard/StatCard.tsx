import type { ReactNode } from "react";

import { Badge } from "../ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";

interface StatCardProps {
    label: string;
    value: string;
    detail: string;
    eyebrow?: string;
    progress?: number;
    tone?: "primary" | "warm" | "cool" | "success" | "warning" | "muted";
    footer?: ReactNode;
}

export function StatCard({
    label,
    value,
    detail,
    eyebrow,
    progress,
    tone = "muted",
    footer,
}: StatCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-text-secondary">{label}</p>
                        <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
                    </div>
                    {eyebrow ? <Badge tone={tone}>{eyebrow}</Badge> : null}
                </div>
                <CardDescription>{detail}</CardDescription>
            </CardHeader>
            {typeof progress === "number" || footer ? (
                <CardContent className="space-y-4">
                    {typeof progress === "number" ? <ProgressBar value={progress} /> : null}
                    {footer}
                </CardContent>
            ) : null}
        </Card>
    );
}