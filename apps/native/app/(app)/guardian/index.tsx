import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ArrowRight01Icon,
    Bookmark01Icon,
    ChartBarLineIcon,
    Home01Icon,
    Settings02Icon,
    UserCircleIcon,
    UserGroupIcon,
} from 'hugeicons-react-native';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import type { GuardianDashboardContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { GuardianEmptyVisual } from '@/components/guardian/GuardianEmptyVisual';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatRelativeDate } from '@/lib/formatters';

export default function GuardianDashboardScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<GuardianDashboardContent>(
        ROUTES.GUARDIAN.DASHBOARD_PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load linked children and companion permissions after a guardian session is active."
                        title="The Household dashboard needs your session"
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
                        title="Household could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content, permissions } = data;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <Home01Icon color="#4F46E5" size={18} strokeWidth={1.8} />
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Guardian hub</Text>
                    </View>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">A calm overview of your household learning</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">See who is active, who needs support, and act quickly.</Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                {content.summary.childrenCount} linked children
                            </Text>
                        </View>
                        <View className="rounded-full bg-sky-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                Average streak {content.summary.averageStreak} days
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">This week</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">
                            {content.summary.activeThisWeek}/{content.summary.childrenCount}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">Children active this week.</Text>
                    </View>
                    <View className="min-w-[160px] flex-1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Pending invites</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">{content.summary.pendingInvites}</Text>
                        <Text className="mt-2 text-sm leading-6 text-slate-600">Invites waiting to be accepted.</Text>
                    </View>
                </View>

                <View className="gap-4">
                    <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-lg font-semibold text-slate-900">Invite a child</Text>
                        <Text className="mt-1 text-sm text-slate-600">Link a new child account.</Text>
                        <View className="mt-4 flex-row flex-wrap gap-2">
                            <Button
                                iconLeft={<UserGroupIcon color="#FFFFFF" size={16} strokeWidth={1.8} />}
                                onPress={() => router.push('/settings')}
                                title="Send invite"
                            />
                            <Button
                                iconLeft={<Bookmark01Icon color="#0F172A" size={16} strokeWidth={1.8} />}
                                onPress={() => router.push('/settings')}
                                title="Copy invite code"
                                variant="secondary"
                            />
                        </View>
                    </View>

                    <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-lg font-semibold text-slate-900">Review progress</Text>
                        <Text className="mt-1 text-sm text-slate-600">Open any child profile for progress signals.</Text>
                        <View className="mt-4 flex-row flex-wrap gap-2">
                            <Button
                                iconLeft={<ChartBarLineIcon color="#FFFFFF" size={16} strokeWidth={1.8} />}
                                onPress={() => {
                                    const firstChild = content.children[0];
                                    if (firstChild) {
                                        router.push(`/guardian/${firstChild.studentId}`);
                                    }
                                }}
                                title="Open overview"
                            />
                            <Button
                                iconLeft={<ArrowRight01Icon color="#0F172A" size={16} strokeWidth={1.8} />}
                                onPress={() => router.push('/guardian')}
                                title="See all children"
                                variant="secondary"
                            />
                        </View>
                    </View>

                    <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <Text className="text-lg font-semibold text-slate-900">Change companion controls</Text>
                        <Text className="mt-1 text-sm text-slate-600">Adjust support settings per child.</Text>
                        <View className="mt-4 flex-row flex-wrap gap-2">
                            <Button
                                iconLeft={<Settings02Icon color="#FFFFFF" size={16} strokeWidth={1.8} />}
                                onPress={() => {
                                    const firstEditableChild = content.children.find((child) => can(permissions, 'can_change_companion_controls', child.studentId));
                                    if (firstEditableChild) {
                                        router.push(`/guardian/${firstEditableChild.studentId}/companion`);
                                    }
                                }}
                                title="Adjust controls"
                            />
                            <Button
                                iconLeft={<UserCircleIcon color="#0F172A" size={16} strokeWidth={1.8} />}
                                onPress={() => router.push('/settings/companion-controls')}
                                title="Review defaults"
                                variant="secondary"
                            />
                        </View>
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <ChartBarLineIcon color="#0F172A" size={20} strokeWidth={1.8} />
                        <Text className="text-2xl font-semibold text-slate-900">Children overview</Text>
                    </View>
                    <View className="mt-5 gap-4">
                        {content.children.length ? content.children.map((child) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={child.studentId}>
                                <Text className="text-lg font-semibold text-slate-900">{child.name}</Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">
                                    Last active {formatRelativeDate(child.lastActiveAt)}
                                </Text>
                                <View className="mt-3 flex-row flex-wrap gap-2">
                                    <View className="rounded-full bg-indigo-100 px-3 py-1">
                                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                            {child.streak}-day streak
                                        </Text>
                                    </View>
                                    {child.subjects.map((subject) => (
                                        <View className="rounded-full bg-slate-200 px-3 py-1" key={`${child.studentId}-${subject.name}`}>
                                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                                                {subject.name}: {subject.strengthLevel.replace('_', ' ')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                <View className="mt-4 flex-row flex-wrap gap-3">
                                    <Button
                                        disabled={!can(permissions, 'can_view_child_progress', child.studentId)}
                                        onPress={() => router.push(`/guardian/${child.studentId}`)}
                                        title="View child"
                                        variant="secondary"
                                    />
                                    <Button
                                        disabled={!can(permissions, 'can_change_companion_controls', child.studentId)}
                                        onPress={() => router.push(`/guardian/${child.studentId}/companion`)}
                                        title="Companion controls"
                                    />
                                </View>
                            </View>
                        )) : (
                            <GuardianEmptyVisual
                                subtitle="Invite accepted children will appear here with progress signals."
                                title="No linked children yet"
                            />
                        )}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <Settings02Icon color="#0F172A" size={20} strokeWidth={1.8} />
                        <Text className="text-2xl font-semibold text-slate-900">Pending invites</Text>
                    </View>
                    <View className="mt-5 gap-4">
                        {content.pendingInvites.length ? content.pendingInvites.map((invite) => (
                            <View className="rounded-[28px] bg-slate-50 p-4" key={invite.id}>
                                <Text className="text-base font-semibold text-slate-900">
                                    {invite.childEmail ?? `Invite code ${invite.code}`}
                                </Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">
                                    Sent {formatRelativeDate(invite.sentAt)} • {invite.status}
                                </Text>
                            </View>
                        )) : (
                            <GuardianEmptyVisual
                                subtitle="New invites will appear here with resend and revoke actions."
                                title="Invite queue is empty"
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
