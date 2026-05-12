import { useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    CheckmarkCircle02Icon,
    ChartBarLineIcon,
    Settings02Icon,
    Shield01Icon,
    UserMultiple02Icon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

const CAPABILITIES = [
    { Icon: ChartBarLineIcon, text: 'Monitor your child\'s progress and growth areas' },
    { Icon: UserMultiple02Icon, text: 'Manage learning preferences for each child' },
    { Icon: Settings02Icon, text: 'Set daily lesson goals and review quiz scores' },
    { Icon: CheckmarkCircle02Icon, text: 'Approve topics and control what they learn' },
];

export default function GuardianWelcomeScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40, gap: 32 }}
            >
                {/* Icon */}
                <View className="items-center">
                    <View className="h-28 w-28 items-center justify-center rounded-full bg-secondary-100">
                        <Shield01Icon size={52} color="#4C7E63" />
                    </View>
                </View>

                {/* Heading */}
                <View className="items-center gap-2">
                    <Text className="text-center text-3xl font-bold text-slate-900">
                        You're all set!
                    </Text>
                    <Text className="text-center text-base leading-7 text-slate-500">
                        Your Guardian account is ready. Here's what you can do once you add a child.
                    </Text>
                </View>

                {/* Capabilities */}
                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    {CAPABILITIES.map(({ Icon, text }, i) => (
                        <View key={i} className="flex-row items-start gap-3">
                            <View className="mt-0.5 rounded-lg bg-secondary-100 p-1.5">
                                <Icon size={16} color="#4C7E63" />
                            </View>
                            <Text className="flex-1 text-sm leading-6 text-slate-700">{text}</Text>
                        </View>
                    ))}
                </View>

                {/* CTA */}
                <View className="gap-3">
                    <TouchableOpacity
                        onPress={() => router.replace('/(app)/(home)')}
                        className="h-14 items-center justify-center rounded-[24px] bg-secondary-600"
                        activeOpacity={0.8}
                    >
                        <Text className="text-base font-bold text-white">Go to my dashboard</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
