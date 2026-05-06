import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";

interface ActionCardProps {
    title: string;
    description: string;
    eyebrow: string;
    primaryAction: string;
    secondaryAction?: string;
    detail?: string;
    footer?: ReactNode;
}

export function ActionCard({
    title,
    description,
    eyebrow,
    primaryAction,
    secondaryAction,
    detail,
    footer,
}: ActionCardProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <Badge tone="primary" className="w-fit">
                    {eyebrow}
                </Badge>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            {detail || footer ? (
                <CardContent className="space-y-3">
                    {detail ? <p className="text-sm text-text-secondary">{detail}</p> : null}
                    {footer}
                </CardContent>
            ) : null}
            <CardFooter>
                <Button>{primaryAction}</Button>
                {secondaryAction ? <Button variant="secondary">{secondaryAction}</Button> : null}
            </CardFooter>
        </Card>
    );
}