import { ProgressBar } from "../ui/ProgressBar";

interface PerformanceListItem {
    label: string;
    value: number;
    trailing: string;
}

interface PerformanceListProps {
    items: PerformanceListItem[];
}

export function PerformanceList({ items }: PerformanceListProps) {
    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div className="space-y-2" key={item.label}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-text-primary">{item.label}</span>
                        <span className="text-text-secondary">{item.trailing}</span>
                    </div>
                    <ProgressBar value={item.value} />
                </div>
            ))}
        </div>
    );
}