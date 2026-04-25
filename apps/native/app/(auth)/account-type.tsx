import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraduateFemaleIcon, UserMultiple02Icon } from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { useNativeAccountType } from '@/hooks/useAuthMutations';

const TYPES = [
    {
        value: 'student' as const,
        label: 'Student',
        description: 'I want to learn and improve my skills.',
        Icon: GraduateFemaleIcon,
    },
    {
        value: 'guardian' as const,
        label: 'Guardian',
        description: "I want to support a child's learning journey.",
        Icon: UserMultiple02Icon,
    },
];

export default function AccountTypeScreen() {
    const router = useRouter();
    const { mutate, isLoading, error } = useNativeAccountType();
    const [selected, setSelected] = useState<'student' | 'guardian' | null>(null);

    async function handleContinue() {
        if (!selected) return;
        await mutate(
            { accountType: selected },
            {
                onSuccess: () => {
                    if (selected === 'guardian') {
                        router.replace('/(onboarding)/guardian-welcome');
                    } else {
                        router.replace('/(onboarding)/profile-setup');
                    }
                },
            },
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-8 pt-10 gap-8"
                keyboardShouldPersistTaps="handled"
            >
                <View className="gap-1">
                    <Text className="text-3xl font-bold text-slate-900">Who are you?</Text>
                    <Text className="text-base leading-7 text-slate-500">
                        Lernard will personalise everything based on your role.
                    </Text>
                </View>

                {error ? (
                    <View className="rounded-xl bg-red-50 px-4 py-3">
                        <Text className="text-sm text-red-600">{error}</Text>
                    </View>
                ) : null}

                <View className="gap-3">
                    {TYPES.map(({ value, label, description, Icon }) => (
                        <TouchableOpacity
                            key={value}
                            onPress={() => setSelected(value)}
                            activeOpacity={0.8}
                            className={`flex-row items-start gap-4 rounded-[24px] border-2 p-5 ${selected === value
                                ? 'border-primary bg-primary-50'
                                : 'border-slate-200 bg-white'
                                }`}
                        >
                            <View
                                className={`mt-0.5 rounded-xl p-2 ${selected === value ? 'bg-primary-100' : 'bg-slate-100'
                                    }`}
                            >
                                <Icon
                                    size={24}
                                    color={selected === value ? '#4F62A3' : '#6B7280'}
                                />
                            </View>
                            <View className="flex-1 gap-0.5">
                                <Text className="text-base font-semibold text-slate-900">{label}</Text>
                                <Text className="text-sm leading-6 text-slate-500">{description}</Text>
                            </View>
                            <View
                                className={`mt-1 h-5 w-5 rounded-full border-2 ${selected === value
                                    ? 'border-primary bg-primary'
                                    : 'border-slate-300'
                                    }`}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!selected || isLoading}
                    className="h-14 items-center justify-center rounded-[24px] bg-primary"
                    style={{ opacity: !selected || isLoading ? 0.5 : 1 }}
                    activeOpacity={0.8}
                >
                    <Text className="text-base font-bold text-white">
                        {isLoading ? 'Saving…' : 'Continue'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
