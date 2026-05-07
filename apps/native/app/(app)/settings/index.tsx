import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    ArrowRight01Icon,
    BookOpen01Icon,
    Bookmark01Icon,
    PaintBrushIcon,
    Settings02Icon,
    Target01Icon,
    UserCircleIcon,
} from 'hugeicons-react-native';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import {
    type CompanionControls,
    type GuardianManagedChildSettings,
    type SettingsContent,
    type UserSettings,
} from '@lernard/shared-types';

import { Switch } from '@rnr/switch';
import { Text } from '@rnr/text';

import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

export default function SettingsScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);

    useEffect(() => {
        if (!data?.content || data.content.roleView !== 'student') {
            setSettings(null);
            setLockedSettings([]);
            return;
        }

        setSettings(data.content.settings);
        setLockedSettings(data.content.lockedSettings);
    }, [data]);

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

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (!data?.content) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Settings unavailable"
                        description="The settings payload was empty for this request."
                        onActionPress={refetch}
                        title="Could not open settings"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (data.content.roleView === 'guardian') {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                    <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Guardian settings</Text>
                        <Text className="mt-3 text-3xl font-semibold text-slate-900">Household controls</Text>
                        <Text className="mt-3 text-base leading-7 text-slate-600">
                            Manage linked children from one role-aware settings payload.
                        </Text>
                        <View className="mt-5 flex-row flex-wrap gap-2">
                            <View className="rounded-full bg-indigo-100 px-3 py-1">
                                <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                    {data.content.children.length} linked children
                                </Text>
                            </View>
                        </View>
                        <View className="mt-5 flex-row flex-wrap gap-2">
                            <Button onPress={() => router.push('/guardian')} title="Open Household" />
                        </View>
                    </View>

                    <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                        <Text className="text-2xl font-semibold text-slate-900">Children</Text>
                        <View className="mt-5 gap-4">
                            {data.content.children.length ? data.content.children.map((child) => (
                                <GuardianChildRow
                                    child={child}
                                    key={child.studentId}
                                    onOpenCompanion={() => router.push(`/guardian/${child.studentId}/companion`)}
                                    onOpenProfile={() => router.push(`/guardian/${child.studentId}`)}
                                />
                            )) : (
                                <Text className="text-base leading-7 text-slate-600">
                                    No linked children yet. Invite a child from Household to start managing settings.
                                </Text>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Back to Household"
                        badge="Settings unavailable"
                        description="This settings payload is not available for your current role yet."
                        onActionPress={() => router.push('/guardian')}
                        title="Could not open settings"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const permissions = data?.permissions ?? [];
    const canEditMode = can(permissions, 'can_edit_mode') && !isLocked(lockedSettings, 'mode');
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, 'companion-controls');

    const viewer = data.content.viewer;
    const initials = viewer.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">

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

                {/* Section: Learning */}
                <SectionHeader title="Learning" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        icon={<BookOpen01Icon color="#6366f1" size={20} />}
                        label="Learning mode"
                        onPress={() => router.push('/settings/mode')}
                        value={capitalize(settings.learningMode)}
                    />
                </View>

                {/* Section: Preferences */}
                <SectionHeader title="Preferences" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <NavRow
                        icon={<PaintBrushIcon color="#6366f1" size={20} />}
                        label="Appearance"
                        onPress={() => router.push('/settings/preferences')}
                        value={capitalize(settings.appearance)}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <NavRow
                        icon={<Target01Icon color="#6366f1" size={20} />}
                        label="Daily goal"
                        onPress={() => router.push('/settings/preferences')}
                        value={`${settings.dailyGoal} sessions`}
                    />
                </View>

                {/* Section: Study controls */}
                <SectionHeader title="Study controls" />
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <InlineToggleRow
                        checked={companionControls.showCorrectAnswers}
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        label="Show correct answers"
                        onCheckedChange={(v) => updateCompanionControl('showCorrectAnswers', v)}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <InlineToggleRow
                        checked={companionControls.allowHints}
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        label="Allow hints"
                        onCheckedChange={(v) => updateCompanionControl('allowHints', v)}
                    />
                    <View className="mx-4 h-px bg-slate-100" />
                    <InlineToggleRow
                        checked={companionControls.allowSkip}
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        label="Allow skip"
                        onCheckedChange={(v) => updateCompanionControl('allowSkip', v)}
                    />
                </View>

                {/* Section: Account */}
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
                        label="Profile"
                        onPress={() => router.push('/settings/profile')}
                    />
                </View>

                {/* Plans & billing */}
                <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
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

    async function updateCompanionControl(
        key: 'showCorrectAnswers' | 'allowHints' | 'allowSkip',
        value: boolean,
    ) {
        if (companionControlsLocked) return;
        const nextControls = { ...companionControls, [key]: value };
        setSettings((current) => current ? { ...current, companionControls: nextControls } : current);
        setSavingField('companion-controls');
        try {
            const savedControls = await nativeApiFetch<CompanionControls>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: 'PATCH',
                body: JSON.stringify({
                    showCorrectAnswers: nextControls.showCorrectAnswers,
                    allowHints: nextControls.allowHints,
                    allowSkip: nextControls.allowSkip,
                }),
            });
            setSettings((current) => current ? { ...current, companionControls: savedControls } : current);
        } catch {
            setSettings((current) => current ? { ...current, companionControls } : current);
        } finally {
            setSavingField(null);
        }
    }
}

function GuardianChildRow({
    child,
    onOpenCompanion,
    onOpenProfile,
}: {
    child: GuardianManagedChildSettings;
    onOpenCompanion: () => void;
    onOpenProfile: () => void;
}) {
    return (
        <View className="rounded-[24px] bg-slate-50 p-4">
            <Text className="text-lg font-semibold text-slate-900">{child.name}</Text>
            <Text className="mt-1 text-sm text-slate-600">{child.email ?? 'No email on file'}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-indigo-100 px-2.5 py-1">
                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                        {child.settings.learningMode}
                    </Text>
                </View>
                <View className="rounded-full bg-sky-100 px-2.5 py-1">
                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        {child.settings.dailyGoal} sessions
                    </Text>
                </View>
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
                <Button onPress={onOpenProfile} title="View child" variant="secondary" />
                <Button onPress={onOpenCompanion} title="Companion controls" />
            </View>
        </View>
    );
}

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
    icon: React.ReactNode;
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

function InlineToggleRow({
    checked,
    disabled,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onCheckedChange: (v: boolean) => void;
}) {
    return (
        <View className={`flex-row items-center justify-between px-4 py-3.5 ${disabled ? 'opacity-60' : ''}`}>
            <Text className="text-sm font-semibold text-slate-800">{label}</Text>
            <Switch
                disabled={disabled}
                ios_backgroundColor="#cbd5e1"
                onValueChange={onCheckedChange}
                thumbColor="#ffffff"
                trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                value={checked}
            />
        </View>
    );
}

function ensureCompanionControls(companionControls: CompanionControls | null) {
    return companionControls ?? {
        showCorrectAnswers: true,
        allowHints: true,
        allowSkip: false,
        lockedByGuardian: false,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: 'You',
    };
}

function isLocked(lockedSettings: string[], key: string) {
    return lockedSettings.includes(key);
}
