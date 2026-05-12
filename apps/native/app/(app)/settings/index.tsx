import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ArrowRight01Icon,
    BookOpen01Icon,
    Bookmark01Icon,
    Home01Icon,
    Moon02Icon,
    Settings02Icon,
    UserCircleIcon,
    UserGroupIcon,
} from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import type {
    GuardianManagedChildSettings,
    GuardianSettingsContent,
    SettingsContent,
    StudentSettingsContent,
} from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';

// ─── Main screen ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load and save your live settings after you sign in."
                        title="Your settings need your session"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Failed to load"
                        description={error.message}
                        onActionPress={refetch}
                        title="Settings could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (!data?.content) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Settings unavailable"
                        description="The settings payload was empty. Please try again."
                        onActionPress={refetch}
                        title="Could not open settings"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (data.content.roleView === 'guardian') {
        return <GuardianSettingsView content={data.content} />;
    }

    return <StudentSettingsView content={data.content} />;
}

// ─── Guardian view ───────────────────────────────────────────────────────────

function GuardianSettingsView({ content }: { content: GuardianSettingsContent }) {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>

                {/* Hero */}
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <Home01Icon color="#4F46E5" size={18} />
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
                            Guardian settings
                        </Text>
                    </View>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">
                        Household controls
                    </Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        {content.viewer.name} · {content.children.length} linked{' '}
                        {content.children.length === 1 ? 'child' : 'children'}
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-3">
                        <Button
                            iconLeft={<Home01Icon color="#FFFFFF" size={16} />}
                            onPress={() => router.push('/guardian')}
                            title="Open Household"
                        />
                    </View>
                </View>

                {/* Children list */}
                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <UserGroupIcon color="#0F172A" size={20} />
                        <Text className="text-2xl font-semibold text-slate-900">Children</Text>
                    </View>

                    <View className="mt-5 gap-4">
                        {content.children.length === 0 ? (
                            <Text className="text-base leading-7 text-slate-600">
                                No linked children yet. Invite a child from Household to start managing settings.
                            </Text>
                        ) : (
                            content.children.map((child) => (
                                <GuardianChildCard
                                    child={child}
                                    key={child.studentId}
                                    onCompanion={() => router.push(`/guardian/${child.studentId}/companion`)}
                                    onProfile={() => router.push(`/guardian/${child.studentId}`)}
                                />
                            ))
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function GuardianChildCard({
    child,
    onProfile,
    onCompanion,
}: {
    child: GuardianManagedChildSettings;
    onProfile: () => void;
    onCompanion: () => void;
}) {
    return (
        <View className="rounded-[24px] bg-slate-50 p-4">
            <Text className="text-base font-semibold text-slate-900">{child.name}</Text>
            <Text className="mt-0.5 text-sm text-slate-500">{child.email ?? 'No email on file'}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-indigo-100 px-2.5 py-1">
                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                        {capitalize(child.settings.learningMode)}
                    </Text>
                </View>
                <View className="rounded-full bg-sky-100 px-2.5 py-1">
                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        {child.settings.dailyGoal} sessions
                    </Text>
                </View>
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
                <Button onPress={onProfile} title="View child" variant="secondary" />
                <Button onPress={onCompanion} title="Companion controls" />
            </View>
        </View>
    );
}

// ─── Student view ────────────────────────────────────────────────────────────

function StudentSettingsView({
    content,
}: {
    content: StudentSettingsContent;
}) {
    const router = useRouter();
    const viewer = content.viewer;
    const settings = content.settings;

    const initials = viewer.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>

                {/* Profile header */}
                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-4">
                        <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                            <Text className="text-lg font-semibold text-indigo-600">{initials}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-slate-900">{viewer.name}</Text>
                            <Text className="mt-0.5 text-sm text-slate-500">{viewer.email ?? '—'}</Text>
                            <View className="mt-2 flex-row flex-wrap gap-1.5">
                                <View className="rounded-full bg-indigo-100 px-2.5 py-0.5">
                                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                                        {capitalize(viewer.plan)}
                                    </Text>
                                </View>
                                <View className="rounded-full bg-sky-100 px-2.5 py-0.5">
                                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        {capitalize(viewer.role)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <Pressable
                        className="mt-4 flex-row items-center justify-between rounded-[20px] bg-slate-50 px-4 py-3"
                        onPress={() => router.push('/settings/profile')}
                    >
                        <View className="flex-row items-center gap-3">
                            <UserCircleIcon color="#6366f1" size={20} />
                            <Text className="text-sm font-semibold text-slate-800">Edit profile</Text>
                        </View>
                        <ArrowRight01Icon color="#94a3b8" size={18} />
                    </Pressable>
                </View>

                {/* Learning */}
                <SectionHeader title="Learning" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        icon={<BookOpen01Icon color="#6366f1" size={20} />}
                        label="Study"
                        onPress={() => router.push('/settings/study')}
                        value={capitalize(settings.learningMode)}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <NavRow
                        icon={<BookOpen01Icon color="#6366f1" size={20} />}
                        label="Learning mode"
                        onPress={() => router.push('/settings/mode')}
                        value={capitalize(settings.learningMode)}
                    />
                </View>

                {/* Notifications */}
                <SectionHeader title="Notifications" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        label="Notifications"
                        onPress={() => router.push('/settings/notifications')}
                    />
                </View>

                {/* Appearance */}
                <SectionHeader title="Appearance" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        icon={<Moon02Icon color="#6366f1" size={20} />}
                        label="Appearance"
                        onPress={() => router.push('/settings/preferences')}
                        value={capitalize(settings.appearance)}
                    />
                </View>

                {/* Account */}
                <SectionHeader title="Account" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        icon={<Bookmark01Icon color="#6366f1" size={20} />}
                        label="My subjects"
                        onPress={() => router.push('/settings/subjects')}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <NavRow
                        icon={<UserCircleIcon color="#6366f1" size={20} />}
                        label="Account"
                        onPress={() => router.push('/settings/account')}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <NavRow
                        icon={<Settings02Icon color="#6366f1" size={20} />}
                        label="Plans & billing"
                        onPress={() => router.push('/settings/plans')}
                        value={capitalize(viewer.plan)}
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
    return (
        <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {title}
        </Text>
    );
}

function NavRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon?: React.ReactNode;
    label: string;
    value?: string;
    onPress: () => void;
}) {
    return (
        <Pressable className="flex-row items-center justify-between px-4 py-3.5" onPress={onPress}>
            <View className="flex-row items-center gap-3">
                {icon}
                <Text className="text-sm font-semibold text-slate-800">{label}</Text>
            </View>
            <View className="flex-row items-center gap-2">
                {value ? <Text className="text-sm text-slate-500">{value}</Text> : null}
                <ArrowRight01Icon color="#94a3b8" size={18} />
            </View>
        </Pressable>
    );
}
