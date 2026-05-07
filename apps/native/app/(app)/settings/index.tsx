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

interface AuthUser {
    id: string;
    name: string;
    email: string | null;
    role: string;
    plan: string;
}

export default function SettingsScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        if (!data?.content) return;
        setSettings(data.content.settings);
        setLockedSettings(data.content.lockedSettings);
    }, [data]);

    useEffect(() => {
        nativeApiFetch<AuthUser>(ROUTES.AUTH.ME).then(setUser).catch(() => null);
    }, []);

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

    if (loading || !settings) {
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

    const permissions = data?.permissions ?? [];
    const canEditMode = can(permissions, 'can_edit_mode') && !isLocked(lockedSettings, 'mode');
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, 'companion-controls');

    const initials = (user?.name ?? '?')
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
                            <Text className="text-base font-semibold text-slate-900">{user?.name ?? '—'}</Text>
                            <Text className="mt-0.5 text-sm text-slate-500">{user?.email ?? '—'}</Text>
                            <View className="mt-2 flex-row flex-wrap gap-1.5">
                                <View className="rounded-full bg-indigo-100 px-2.5 py-0.5">
                                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                                        {capitalize(user?.plan ?? 'explorer')}
                                    </Text>
                                </View>
                                <View className="rounded-full bg-sky-100 px-2.5 py-0.5">
                                    <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                                        {capitalize(user?.role ?? 'student')}
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
                        value={capitalize(user?.plan ?? 'Explorer')}
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

function SectionHeader({ title }: { title: string }) {
    return (
        <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
