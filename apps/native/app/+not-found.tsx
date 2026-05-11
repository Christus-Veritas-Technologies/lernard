import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft01Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

export default function NotFoundScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="flex-row items-center gap-3 px-4 pb-3 pt-2 border-b border-border">
                <Link href="/(app)/(home)" asChild>
                    <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-70" hitSlop={8}>
                        <ArrowLeft01Icon color="#64748b" size={20} />
                    </Pressable>
                </Link>
                <Text className="text-lg font-semibold text-text-primary">Not found</Text>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 48,
                    gap: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Icon */}
                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
                    <Text className="text-4xl">🔍</Text>
                </View>

                {/* Text */}
                <View className="items-center gap-2">
                    <Text className="text-2xl font-semibold text-text-primary">Page not found</Text>
                    <Text className="text-center text-sm leading-5 text-text-secondary">
                        We couldn't find the page you're looking for. Let's get you back to your learning.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View className="w-full gap-2">
                    <Link href="/(app)/(home)" asChild>
                        <Pressable className="rounded-2xl bg-indigo-500 py-3 items-center active:opacity-80">
                            <Text className="text-sm font-semibold text-white">Go to Home</Text>
                        </Pressable>
                    </Link>
                    <Link href="/(app)/(home)" asChild>
                        <Pressable className="rounded-2xl border border-border bg-surface py-3 items-center active:opacity-70">
                            <Text className="text-sm font-semibold text-text-primary">Back</Text>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
