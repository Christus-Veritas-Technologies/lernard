import { View, Text, Modal, Pressable, TouchableOpacity } from "react-native";
import { SparklesIcon } from "hugeicons-react-native";
import { useRouter } from "expo-router";

interface UpgradeSheetProps {
    visible: boolean;
    onClose: () => void;
    resource: string;
    resetAt?: string;
}

/**
 * Bottom-sheet-style modal when a limit is hit.
 * No payment UI — navigates to the plans screen.
 */
export function UpgradeSheet({ visible, onClose, resource, resetAt }: UpgradeSheetProps) {
    const router = useRouter();

    const resetLabel = resetAt
        ? new Date(resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })
        : null;

    function goToPlans() {
        onClose();
        router.push("/(app)/settings/plans" as any);
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable className="flex-1 bg-black/50" onPress={onClose} />
            <View className="bg-surface rounded-t-3xl px-6 pt-6 pb-10 gap-4">
                <View className="items-center">
                    <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-3">
                        <SparklesIcon size={20} color="#7B8EC8" />
                    </View>
                    <Text className="text-base font-semibold text-text text-center">
                        You've reached your {resource} limit
                    </Text>
                    {resetLabel ? (
                        <Text className="text-sm text-text-secondary text-center mt-1">
                            Your allowance resets on {resetLabel}. Upgrade for more {resource} this cycle.
                        </Text>
                    ) : (
                        <Text className="text-sm text-text-secondary text-center mt-1">
                            You've used all your {resource} for this period.
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    className="w-full bg-primary rounded-xl py-3 items-center"
                    onPress={goToPlans}
                    activeOpacity={0.8}
                >
                    <Text className="text-sm font-semibold text-white">See upgrade options</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="w-full items-center py-2"
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text className="text-sm text-text-secondary">Maybe later</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
