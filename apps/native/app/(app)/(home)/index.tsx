import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { HomeContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import GuardianDashboardScreen from '@/app/(app)/guardian';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatRelativeDate } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';
import { useAuthStore } from '@/store/store';

export default function HomeScreen() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [role, setRole] = useState<string | null>(null);
    const [roleError, setRoleError] = useState<Error | null>(null);
    const [roleLoading, setRoleLoading] = useState(isAuthenticated);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        if (!isAuthenticated) {
            setRole(null);
            setRoleError(null);
            setRoleLoading(false);
            return () => {
                cancelled = true;
            };
        }

        async function loadRole() {
            setRoleLoading(true);
            setRoleError(null);

            try {
                const user = await nativeApiFetch<AuthUser>(ROUTES.AUTH.ME);

                if (cancelled) {
                    return;
                }

                setRole(user.role);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setRole(null);
                setRoleError(error instanceof Error ? error : new Error('Could not confirm your account role.'));
            } finally {
                if (!cancelled) {
                    setRoleLoading(false);
                }
            }
        }

        void loadRole();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, requestVersion]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard needs your session token before it can load your real Home payload on mobile."
                        title="Your dashboard is ready when you are"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (roleLoading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (roleError) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Role check failed"
                        description={roleError.message}
                        onActionPress={() => setRequestVersion((current) => current + 1)}
                        title="Home could not confirm your account"
                        tone="warning"        
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (role === 'guardian') {
        return <GuardianDashboardScreen />;
    }

    return <StudentHomeDashboardScreen />;
}

interface AuthUser {
    role: string;
}

interface PendingInvite {
    pending: boolean;
    code?: string;
    guardianName?: string;
}

function StudentHomeDashboardScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<HomeContent>(
        ROUTES.HOME.PAYLOAD,
    );
    const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isActingOnInvite, setIsActingOnInvite] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        nativeApiFetch<PendingInvite>(ROUTES.GUARDIAN.PENDING_INVITE_FOR_ME)
            .then((result) => {
                if (result.pending) {
                    setPendingInvite(result);
                }
            })
            .catch(() => { /* non-critical — ignore */ });
    }, [isAuthenticated]);

    async function handleAcceptInvite() {
        if (!pendingInvite?.code) return;
        setIsActingOnInvite(true);
        try {
            await nativeApiFetch(ROUTES.GUARDIAN.ACCEPT_INVITE, {
                method: 'POST',
                body: JSON.stringify({ code: pendingInvite.code }),
            });
            setShowInviteModal(false);
            setPendingInvite(null);
        } catch {
            // keep modal open — user can try again
        } finally {
            setIsActingOnInvite(false);
        }
    }

    async function handleDeclineInvite() {
        if (!pendingInvite?.code) return;
        setIsActingOnInvite(true);
        try {
            await nativeApiFetch(ROUTES.GUARDIAN.DECLINE_INVITE, {
                method: 'POST',
                body: JSON.stringify({ code: pendingInvite.code }),
            });
            setShowInviteModal(false);
            setPendingInvite(null);
        } catch {
            // keep modal open — user can try again
        } finally {
            setIsActingOnInvite(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard needs your session token before it can load your real Home payload on mobile."
                        title="Your dashboard is ready when you are"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Live payload failed"
                        description={error?.message ?? 'Something interrupted the mobile request.'}
                        onActionPress={refetch}
                        title="Home could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content } = data;
    const showEmptyDashboard = !content.subjects.length;

    if (showEmptyDashboard) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Fresh start"
                        description="Your first live Home payload is connected. As soon as lessons or subjects are added, this dashboard will fill with real progress and activity."
                        title={content.greeting}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Modal
                animationType="slide"
                onRequestClose={() => setShowInviteModal(false)}
                presentationStyle="pageSheet"
                transparent={false}
                visible={showInviteModal}
            >
                <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
                    <View className="flex-1 px-6 pt-6 pb-8 gap-6">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-2xl font-bold text-slate-900">Guardian invite</Text>
                            <Pressable onPress={() => setShowInviteModal(false)} className="px-2 py-1">
                                <Text className="text-base text-slate-500">Dismiss</Text>
                            </Pressable>
                        </View>
                        <Text className="text-base leading-7 text-slate-600">
                            {pendingInvite?.guardianName ?? 'A guardian'} has invited you to connect your Lernard account.
                            They will be able to view your progress and manage your learning settings.
                        </Text>
                        <View className="gap-3">
                            <Button
                                disabled={isActingOnInvite}
                                onPress={handleAcceptInvite}
                                title={isActingOnInvite ? 'Working...' : 'Accept invite'}
                            />
                            <Button
                                disabled={isActingOnInvite}
                                onPress={handleDeclineInvite}
                                title="Decline"
                                variant="secondary"
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                {pendingInvite?.pending && (
                    <Pressable
                        onPress={() => setShowInviteModal(true)}
                        className="flex-row items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3"
                    >
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-indigo-900">Guardian invite pending</Text>
                            <Text className="mt-0.5 text-xs leading-5 text-indigo-700">
                                {pendingInvite.guardianName ?? 'A guardian'} wants to connect with you. Tap to review.
                            </Text>
                        </View>
                        <Text className="text-sm font-semibold text-indigo-600">View →</Text>
                    </Pressable>
                )}

                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Your dashboard</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">{content.greeting}</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Pick up where you left off, strengthen a growth area, or start a fresh sprint with Lernard ready to guide the next step.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-emerald-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                {content.streak}-day streak
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                Goal {content.dailyGoalProgress}/{content.dailyGoalTarget}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button onPress={() => router.push('/settings')} title="Settings" variant="secondary" />
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-500">Today</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">
                            {content.dailyGoalProgress}/{content.dailyGoalTarget}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">
                            Sessions completed toward today&apos;s target. 
                        </Text>
                    </View>
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-600">Current level</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">Level {content.xpLevel}</Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">
                            Momentum from recent lessons, quizzes, and chat support.
                        </Text>
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1">
                            <Text className="text-2xl font-semibold text-slate-900">Subject focus</Text>
                            <Text className="mt-2 text-base leading-7 text-slate-600">
                                Keep the strongest subjects warm while giving growth areas deliberate attention.
                            </Text>
                        </View>
                        <Button onPress={() => router.push('/settings')} title="Settings" variant="ghost" />
                    </View>

                    <View className="mt-5 gap-4">
                        {content.subjects.length ? content.subjects.map((subject) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={subject.subjectId}>
                                <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                        <Text className="text-lg font-semibold text-slate-900">{subject.name}</Text>
                                        <Text className="mt-1 text-sm leading-6 text-slate-600">
                                            Last active {formatRelativeDate(subject.lastActiveAt)}
                                        </Text>
                                    </View>
                                    <View className={getStrengthBadgeClassName(subject.strengthLevel)}>
                                        <Text className={getStrengthTextClassName(subject.strengthLevel)}>
                                            {subject.strengthLevel.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="mt-3 text-sm leading-6 text-slate-600">
                                    Priority in your queue: #{subject.priorityIndex + 1}
                                </Text>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No subjects have been added yet. Once onboarding or topic selection is complete, they will appear here with real strength signals.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function getStrengthBadgeClassName(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'rounded-full bg-emerald-100 px-3 py-1';
    }

    if (strengthLevel === 'developing') {
        return 'rounded-full bg-amber-100 px-3 py-1';
    }

    return 'rounded-full bg-rose-100 px-3 py-1';
}

function getStrengthTextClassName(strengthLevel: string) {
    if (strengthLevel === 'strong') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700';
    }

    if (strengthLevel === 'developing') {
        return 'text-xs font-semibold uppercase tracking-[0.16em] text-amber-800';
    }

    return 'text-xs font-semibold uppercase tracking-[0.16em] text-rose-700';
}
