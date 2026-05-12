import { View, Text, Pressable } from "react-native";
import { AlertCircleIcon } from "hugeicons-react-native";
import { useRouter } from "expo-router";

interface LimitBannerProps {
    message: string;
    resetAt?: string;
}

/**
 * Inline amber strip shown above an input when a quota is approaching or exhausted.
 */
export function LimitBanner({ message, resetAt }: LimitBannerProps) {
    const router = useRouter();

    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : null;

    return (
        <View className="flex-row items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 mb-2">
            <AlertCircleIcon size={16} color="#d97706" style={{ marginTop: 2 }} />
            <View className="flex-1">
                <Text className="text-sm text-amber-700 dark:text-amber-400">
                    {message}
                    {resetLabel ? ` Resets ${resetLabel}.` : ""}
                </Text>
                <Pressable onPress={() => router.push("/(app)/settings/plans" as any)}>
                    <Text className="text-sm text-primary underline mt-0.5">Upgrade plan</Text>
                </Pressable>
            </View>
        </View>
    );
}
