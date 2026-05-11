import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ArrowLeft01Icon,
    CheckIcon,
    CrownIcon,
    SmileIcon,
    StudentIcon,
} from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import { type Plan } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { nativeApiFetch } from '@/lib/native-api';

interface AuthUser {
    plan: Plan;
}

interface PlanConfig {
    key: Plan;
    name: string;
    tagline: string;
    price: string;
    priceDetail: string;
    featured: boolean;
    icon: React.ComponentType<{ color?: string; size?: number }>;
    features: string[];
}

const plans: PlanConfig[] = [
    {
        key: 'explorer' as Plan,
        name: 'Explorer',
        tagline: 'For anyone getting started',
        price: 'Free',
        priceDetail: 'No card needed',
        featured: false,
        icon: StudentIcon,
        features: [
            'Unlimited subject tracking',
            'First Look baseline assessment',
            'Progress snapshot',
            'Daily goal setting',
            'Guide and Companion modes',
        ],
    },
    {
        key: 'scholar' as Plan,
        name: 'Scholar',
        tagline: 'For serious learners',
        price: 'Coming soon',
        priceDetail: 'Billed monthly',
        featured: true,
        icon: CrownIcon,
        features: [
            'Everything in Explorer',
            'Unlimited conversation history',
            'Deep-dive session mode',
            'Priority topic recommendations',
            'Weekly progress reports',
            'Guardian sharing',
        ],
    },
    {
        key: 'household' as Plan,
        name: 'Household',
        tagline: 'For families learning together',
        price: 'Coming soon',
        priceDetail: 'Covers up to 4 learners',
        featured: false,
        icon: SmileIcon,
        features: [
            'Everything in Scholar',
            'Up to 4 student accounts',
            'Guardian dashboard',
            'Cross-account progress view',
            'Companion controls per child',
            'Shared daily goal tracking',
        ],
    },
];

export default function PlansScreen() {
    const router = useRouter();
    const [currentPlan, setCurrentPlan] = useState<Plan>('explorer' as Plan);

    useEffect(() => {
        nativeApiFetch<AuthUser>(ROUTES.AUTH.ME)
            .then((user) => {
                if (user?.plan) setCurrentPlan(user.plan);
            })
            .catch(() => {});
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
                <Pressable
                    onPress={() => router.back()}
                    className="h-9 w-9 items-center justify-center rounded-full bg-surface"
                    hitSlop={8}
                >
                    <ArrowLeft01Icon color="#64748b" size={20} />
                </Pressable>
                <Text className="text-xl font-semibold text-text-primary">Plans &amp; billing</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <Text className="pb-2 text-sm leading-6 text-text-secondary">
                    Simple, transparent pricing. Start free and unlock more when you are ready.
                </Text>

                {/* Plan cards */}
                {plans.map((plan) => {
                    const isCurrent = currentPlan === plan.key;
                    const PlanIcon = plan.icon;

                    return (
                        <View
                            key={plan.key}
                            className={plan.featured
                                ? 'rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-5 dark:bg-indigo-950/30'
                                : 'rounded-2xl border border-border bg-surface p-5'}
                        >
                            {/* Most popular label */}
                            {plan.featured && (
                                <View className="mb-3 self-start rounded-full bg-indigo-500 px-3 py-1">
                                    <Text className="text-xs font-semibold text-white">Most popular</Text>
                                </View>
                            )}

                            {/* Plan name + icon */}
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-lg font-bold text-text-primary">{plan.name}</Text>
                                    <Text className="mt-0.5 text-xs text-text-secondary">{plan.tagline}</Text>
                                </View>
                                <View className={plan.featured
                                    ? 'h-11 w-11 items-center justify-center rounded-xl bg-indigo-200 dark:bg-indigo-900'
                                    : 'h-11 w-11 items-center justify-center rounded-xl bg-background-subtle'}>
                                    <PlanIcon color={plan.featured ? '#4f46e5' : '#64748b'} size={22} />
                                </View>
                            </View>

                            {/* Price */}
                            <View className="mt-4">
                                <Text className="text-3xl font-bold text-text-primary">{plan.price}</Text>
                                <Text className="mt-0.5 text-xs text-text-tertiary">{plan.priceDetail}</Text>
                            </View>

                            {/* CTA badge */}
                            <View className={`mt-4 rounded-xl py-2.5 ${
                                isCurrent
                                    ? 'bg-slate-200 dark:bg-slate-700'
                                    : plan.featured
                                    ? 'bg-indigo-500'
                                    : 'bg-slate-200 dark:bg-slate-700'
                            } items-center`}>
                                <Text className={`text-sm font-semibold ${
                                    plan.featured && !isCurrent ? 'text-white' : 'text-text-secondary'
                                }`}>
                                    {isCurrent ? 'Your current plan' : 'Join the waitlist'}
                                </Text>
                            </View>

                            {/* Features */}
                            <View className="mt-4 gap-3">
                                {plan.features.map((feature) => (
                                    <View key={feature} className="flex-row items-start gap-2.5">
                                        <Check01Icon
                                            color={plan.featured ? '#4f46e5' : '#64748b'}
                                            size={16}
                                            style={{ marginTop: 1 }}
                                        />
                                        <Text className="flex-1 text-sm text-text-secondary">{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })}

                <Text className="text-center text-xs text-text-tertiary">
                    Scholar and Household plans are in development.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
