import { Badge } from "@/components/ui/Badge";

interface TimelineListItem {
    id: string;
    title: string;
    description: string;
    meta: string;
    tone?: "primary" | "warm" | "cool" | "success" | "warning" | "muted";
}

interface TimelineListProps {
    items: TimelineListItem[];
}

export function TimelineList({ items }: TimelineListProps) {
    return (
        <ol className="space-y-4">
            {items.map((item) => (
                <li className="relative rounded-2xl border border-border bg-background/50 p-4" key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                            <p className="text-sm leading-6 text-text-secondary">{item.description}</p>
                        </div>
                        <Badge tone={item.tone ?? "muted"}>{item.meta}</Badge>
                    </div>
                </li>
            ))}
        </ol>
    );
}