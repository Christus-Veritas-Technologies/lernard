import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface PageHeroProps {
    eyebrow?: string;
    title: string;
    description: string;
    aside?: ReactNode;
    children?: ReactNode;
    className?: string;
}

export function PageHero({
    eyebrow,
    title,
    description,
    aside,
    children,
    className,
}: PageHeroProps) {
    return (
        <Card className={cn("overflow-hidden bg-[linear-gradient(135deg,#f9fbff_0%,#ffffff_55%,#fff7f2_100%)]", className)}>
            <CardContent className="mt-0 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)] lg:items-start">
                <div className="space-y-5">
                    <CardHeader>
                        {eyebrow ? (
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-500">
                                {eyebrow}
                            </p>
                        ) : null}
                        <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
                        <CardDescription className="max-w-2xl text-base sm:text-lg">
                            {description}
                        </CardDescription>
                    </CardHeader>
                    {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
                </div>
                {aside ? <div className="grid gap-4">{aside}</div> : null}
            </CardContent>
        </Card>
    );
}