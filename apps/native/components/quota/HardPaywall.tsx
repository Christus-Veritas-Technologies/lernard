import { View, Text, TouchableOpacity } from "react-native";
import { LockIcon, SparklesIcon } from "hugeicons-react-native";
import { useRouter } from "expo-router";

interface HardPaywallProps {
    resource: string;
    resetAt?: string;
}

/**
 * Absolute overlay rendered over a creation form once quota is exhausted.
 * Wrap the parent View in `style={{ position: 'relative' }}` or `className="relative"`.
 */
export function HardPaywall({ resource, resetAt }: HardPaywallProps) {
    const router = useRouter();

    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
        : null;

    return (
        <View
            className="absolute inset-0 z-10 items-center justify-center gap-4 rounded-2xl bg-background/90 px-6"
            style={{ backdropFilter: "blur(4px)" }}
        >
            <View className="h-12 w-12 rounded-full bg-primary/10 items-center justify-center">
                <LockIcon size={22} color="#7B8EC8" />
            </View>
            <View className="items-center gap-1">
                <Text className="text-base font-semibold text-text text-center">
                    You've used all your {resource}
                </Text>
                {resetLabel && (
                    <Text className="text-sm text-text-secondary text-center">
                        Your allowance resets on {resetLabel}.
                    </Text>
                )}
            </View>
            <View className="w-full max-w-xs gap-2">
                <TouchableOpacity
                    className="w-full bg-primary rounded-xl py-3 flex-row items-center justify-center gap-2"
                    onPress={() => router.push("/(app)/settings/plans" as any)}
                    activeOpacity={0.8}
                >
                    <SparklesIcon size={15} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Upgrade plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="w-full items-center py-2"
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Text className="text-sm text-text-secondary">Go back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
