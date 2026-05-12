import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ArrowLeft01Icon,
    CrownIcon,
    SmileIcon,
    StudentIcon,
    UserGroupIcon,
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
    limits: string[];
    periodLabel: string;
}

const studentPlans: PlanConfig[] = [
    {
        key: 'explorer' as Plan,
        name: 'Explorer',
        tagline: 'For anyone getting started',
        price: 'Free',
        priceDetail: 'No card needed',
        featured: false,
        icon: StudentIcon,
        periodLabel: 'Daily limits',
        features: [
            'First Look baseline assessment',
            'Progress snapshot',
            'Daily goal setting',
            'Guide and Companion modes',
        ],
        limits: [
            '2 lessons per day',
            '2 quizzes per day',
            '1 project per day',
            '10 chat messages per day',
            '100 MB storage',
        ],
    },
    {
        key: 'student_scholar' as Plan,
        name: 'Student Scholar',
        tagline: 'For consistent learners',
        price: '$4.99/mo',
        priceDetail: 'Billed monthly',
        featured: false,
        icon: StudentIcon,
        periodLabel: 'Monthly limits',
        features: [
            'Everything in Explorer',
            'Full conversation history',
            'Guardian sharing (read-only)',
            'Weekly progress reports',
        ],
        limits: [
            '40 lessons per month',
            '40 quizzes per month',
            '5 projects per month',
            '500 chat messages per month',
            '500 MB storage',
        ],
    },
    {
        key: 'student_pro' as Plan,
        name: 'Student Pro',
        tagline: 'For serious exam preparation',
        price: '$9.99/mo',
        priceDetail: 'Billed monthly',
        featured: true,
        icon: CrownIcon,
        periodLabel: 'Monthly limits',
        features: [
            'Everything in Student Scholar',
            'Extended sessions',
            'Priority content recommendations',
            'Deep-dive mode',
        ],
        limits: [
            '120 lessons per month',
            '120 quizzes per month',
            '15 projects per month',
            '1,500 chat messages per month',
            '2 GB storage',
        ],
    },
];

const guardianPlans: PlanConfig[] = [
    {
        key: 'guardian_family_starter' as Plan,
        name: 'Family Starter',
        tagline: 'For households beginning with Lernard',
        price: '$7.99/mo',
        priceDetail: 'Billed monthly',
        featured: false,
        icon: SmileIcon,
        periodLabel: 'Monthly limits per child',
        features: [
            'Guardian dashboard',
            'Companion controls per child',
            'Cross-account progress view',
            'Shared daily goal tracking',
        ],
        limits: [
            '50 lessons per child/month',
            '50 quizzes per child/month',
            '5 projects per child/month',
            '600 chat messages per child/month',
            '1 GB storage',
        ],
    },
    {
        key: 'guardian_family_standard' as Plan,
        name: 'Family Standard',
        tagline: 'For active families',
        price: '$14.99/mo',
        priceDetail: 'Billed monthly',
        featured: true,
        icon: UserGroupIcon,
        periodLabel: 'Monthly limits per child',
        features: [
            'Everything in Family Starter',
            'Priority support',
            'Detailed learning insights per child',
        ],
        limits: [
            '80 lessons per child/month',
            '80 quizzes per child/month',
            '10 projects per child/month',
            '800 chat messages per child/month',
            '2 GB storage',
        ],
    },
    {
        key: 'guardian_family_premium' as Plan,
        name: 'Family Premium',
        tagline: 'For families who want it all',
        price: '$24.99/mo',
        priceDetail: 'Billed monthly',
        featured: false,
        icon: CrownIcon,
        periodLabel: 'Monthly limits per child',
        features: [
            'Everything in Family Standard',
            'Dedicated onboarding call',
            'Custom study plans per child',
        ],
        limits: [
            '150 lessons per child/month',
            '150 quizzes per child/month',
            '15 projects per child/month',
            '1,200 chat messages per child/month',
            '5 GB storage',
        ],
    },
];

function PlanCard({
    plan,
    isCurrent,
    subscribing,
    onSubscribe,
}: {
    plan: PlanConfig;
    isCurrent: boolean;
    subscribing: boolean;
    onSubscribe: () => void;
}) {
    const PlanIcon = plan.icon;
    const isFree = plan.key === 'explorer';
    return (
        <View
            className={plan.featured
                ? 'rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-5 dark:bg-indigo-950/30'
                : 'rounded-2xl border border-border bg-surface p-5'}
        >
            {plan.featured && (
                <View className="mb-3 self-start rounded-full bg-indigo-500 px-3 py-1">
                    <Text className="text-xs font-semibold text-white">Most popular</Text>
                </View>
            )}

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

            <View className="mt-4">
                <Text className="text-3xl font-bold text-text-primary">{plan.price}</Text>
                <Text className="mt-0.5 text-xs text-text-tertiary">{plan.priceDetail}</Text>
            </View>

            <Pressable
                disabled={isCurrent || isFree || subscribing}
                onPress={isCurrent || isFree ? undefined : onSubscribe}
                className={`mt-4 rounded-xl py-2.5 ${
                    isCurrent || isFree
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : plan.featured
                        ? 'bg-indigo-500'
                        : 'bg-slate-700 dark:bg-slate-500'
                } items-center ${
                    subscribing ? 'opacity-60' : ''
                }`}
            >
                <Text className={`text-sm font-semibold ${
                    !isCurrent && !isFree ? 'text-white' : 'text-text-secondary'
                }`}>
                    {isCurrent ? 'Your current plan' : subscribing ? 'Loading…' : 'Subscribe'}
                </Text>
            </Pressable>

            {/* Limits */}
            <View className="mt-5 gap-1.5">
                <Text className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                    {plan.periodLabel}
                </Text>
                {plan.limits.map((limit) => (
                    <View key={limit} className="flex-row items-center gap-2">
                        <View className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <Text className="text-sm text-text-secondary">{limit}</Text>
                    </View>
                ))}
            </View>

            {/* Features */}
            <View className="mt-4 gap-3">
                {plan.features.map((feature) => (
                    <View key={feature} className="flex-row items-start gap-2.5">
                        <Text className="text-lg font-bold text-indigo-500">✓</Text>
                        <Text className="flex-1 text-sm text-text-secondary">{feature}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function PlansScreen() {
    const router = useRouter();
    const [currentPlan, setCurrentPlan] = useState<Plan>('explorer' as Plan);
    const [subscribingPlan, setSubscribingPlan] = useState<Plan | null>(null);

    useEffect(() => {
        nativeApiFetch<AuthUser>(ROUTES.AUTH.ME)
            .then((user) => {
                if (user?.plan) setCurrentPlan(user.plan);
            })
            .catch(() => {});
    }, []);

    async function handleSubscribe(plan: Plan) {
        setSubscribingPlan(plan);
        try {
            const response = await nativeApiFetch<{ redirectUrl: string }>(ROUTES.PAYMENTS.INITIATE, {
                method: 'POST',
                body: JSON.stringify({ plan }),
            });
            await Linking.openURL(response.redirectUrl);
        } catch {
            // nativeApiFetch will throw on non-OK responses; swallow silently
        } finally {
            setSubscribingPlan(null);
        }
    }

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
                <Text className="pb-2 text-sm leading-6 text-text-secondary">
                    Simple, transparent pricing. Start free and unlock more when you are ready.
                </Text>

                {/* Student plans */}
                <Text className="text-base font-semibold text-text-primary">Student plans</Text>
                {studentPlans.map((plan) => (
                    <PlanCard
                        key={plan.key}
                        plan={plan}
                        isCurrent={currentPlan === plan.key}
                        subscribing={subscribingPlan === plan.key}
                        onSubscribe={() => void handleSubscribe(plan.key)}
                    />
                ))}

                {/* Guardian plans */}
                <View className="mt-2">
                    <Text className="text-base font-semibold text-text-primary">Guardian plans</Text>
                    <Text className="mt-1 text-xs text-text-secondary">
                        Manage multiple student accounts from a single Guardian dashboard.
                    </Text>
                </View>
                {guardianPlans.map((plan) => (
                    <PlanCard
                        key={plan.key}
                        plan={plan}
                        isCurrent={currentPlan === plan.key}
                        subscribing={subscribingPlan === plan.key}
                        onSubscribe={() => void handleSubscribe(plan.key)}
                    />
                ))}

                <Text className="text-center text-xs text-text-tertiary">
                    Subscriptions are processed securely via Paynow. Prices shown in USD.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
