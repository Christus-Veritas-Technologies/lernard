import { View, Text } from "react-native";
import { cn } from "@/lib/cn";

interface QuotaBarProps {
    label: string;
    used: number;
    limit: number;
    unit?: string;
    className?: string;
}

/**
 * A single resource consumption bar for native.
 * Turns amber at ≥80%, red at 100%.
 */
export function QuotaBar({ label, used, limit, unit }: QuotaBarProps) {
    if (limit <= 0) return null;

    const pct = Math.min(used / limit, 1);
    const isWarning = pct >= 0.8 && pct < 1;
    const isExhausted = pct >= 1;

    const fillColor = isExhausted ? "#ef4444" : isWarning ? "#f59e0b" : "#7B8EC8";
    const countText = unit ? `${used}/${limit} ${unit}` : `${used}/${limit}`;
    const countColor = isExhausted ? "#ef4444" : isWarning ? "#d97706" : "#9ca3af";

    return (
        <View className="flex-row items-center gap-2 flex-1">
            <Text className="text-xs text-text-secondary">{label}</Text>
            <View className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <View
                    // Dynamic width: NativeWind can't do `w-[${pct * 100}%]`, use style prop
                    style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: fillColor, height: "100%", borderRadius: 9999 }}
                />
            </View>
            <Text style={{ color: countColor }} className="text-xs">
                {countText}
            </Text>
        </View>
    );
}
