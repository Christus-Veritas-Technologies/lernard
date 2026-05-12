import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { SettingsContent, StudentSettingsContent, UserSettings } from '@lernard/shared-types';

import { Switch } from '@rnr/switch';
import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

const NUDGE_FREQUENCIES: { value: string; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'in_app_only', label: 'In-app only' },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [plan, setPlan] = useState<string>('');

    const content = data?.content?.roleView === 'student' ? (data.content as StudentSettingsContent) : null;

    useEffect(() => {
        if (content) {
            setSettings(content.settings);
            setPlan(content.viewer.plan);
        }
    }, [content]);

    async function saveNotification(field: string, value: unknown) {
        setSavingField(field);
        const prev = settings ? { ...(settings as any) } : {};
        setSettings((s) => s ? { ...s, [field]: value } : s);
        try {
            await nativeApiFetch(ROUTES.SETTINGS.NOTIFICATIONS, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: value }),
            });
        } catch {
            setSettings((s) => s ? { ...s, ...prev } : s);
        } finally {
            setSavingField(null);
        }
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Sign in required" description="Sign in to manage notifications." title="Notifications unavailable" tone="warm" />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) return <RoleFullScreenLoadingOverlay forceVisible />;

    if (error || !settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Notifications failed to load"
                        description={error?.message ?? 'Something went wrong.'}
                        onActionPress={refetch}
                        title="Notifications unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const s = settings as any;
    const isExplorer = plan === 'EXPLORER' || plan === 'explorer';

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <NativePageHeader
                    onBackPress={() => router.push('/settings')}
                    subtitle="Control reminders, streak alerts, and email updates"
                    title="Notifications"
                />

                {/* Reminders */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Reminders</Text>
                    <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <ToggleRow
                            checked={!!s.reminderEnabled}
                            disabled={savingField === 'reminderEnabled'}
                            description="Daily reminder to study"
                            onCheckedChange={(v) => void saveNotification('reminderEnabled', v)}
                            title="Study reminder"
                        />
                        {s.reminderEnabled ? (
                            <>
                                <View className="mx-4 h-px bg-slate-100" />
                                <View className="px-4 py-3.5">
                                    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reminder time</Text>
                                    <ReminderTimeInput
                                        defaultValue={s.reminderTime ?? ''}
                                        onSave={(v) => void saveNotification('reminderTime', v)}
                                        saving={savingField === 'reminderTime'}
                                    />
                                </View>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Streak & growth */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Streak & growth areas</Text>
                    <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <ToggleRow
                            checked={!!s.streakAlertEnabled}
                            disabled={savingField === 'streakAlertEnabled'}
                            description="Alert when your streak is at risk"
                            onCheckedChange={(v) => void saveNotification('streakAlertEnabled', v)}
                            title="Streak alert"
                        />
                        <View className="mx-4 h-px bg-slate-100" />
                        <ToggleRow
                            checked={!!s.growthAreaNudgeEnabled}
                            disabled={savingField === 'growthAreaNudgeEnabled'}
                            description="Nudges to revisit growth areas"
                            onCheckedChange={(v) => void saveNotification('growthAreaNudgeEnabled', v)}
                            title="Growth area nudges"
                        />
                        {s.growthAreaNudgeEnabled ? (
                            <>
                                <View className="mx-4 h-px bg-slate-100" />
                                <View className="px-4 py-3">
                                    <Text className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nudge frequency</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {NUDGE_FREQUENCIES.map((opt) => (
                                            <Pressable
                                                className={`rounded-[12px] border px-3 py-1.5 ${
                                                    s.growthAreaNudgeFrequency === opt.value
                                                        ? 'border-indigo-500 bg-indigo-500'
                                                        : 'border-slate-200 bg-white'
                                                } ${savingField === 'growthAreaNudgeFrequency' ? 'opacity-60' : ''}`}
                                                disabled={savingField === 'growthAreaNudgeFrequency'}
                                                key={opt.value}
                                                onPress={() => void saveNotification('growthAreaNudgeFrequency', opt.value)}
                                            >
                                                <Text className={`text-xs font-semibold ${s.growthAreaNudgeFrequency === opt.value ? 'text-white' : 'text-slate-600'}`}>
                                                    {opt.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Plan & email */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Plan & email</Text>
                    <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <View className={`flex-row items-center justify-between px-4 py-3.5 ${isExplorer ? 'opacity-60' : ''}`}>
                            <View className="flex-1 pr-4">
                                <Text className="text-sm font-semibold text-slate-800">Plan limit alerts</Text>
                                <Text className="mt-0.5 text-xs text-slate-500">
                                    {isExplorer ? 'Always on for Explorer plan' : 'Alert when approaching plan limits'}
                                </Text>
                            </View>
                            <Switch
                                disabled={isExplorer}
                                ios_backgroundColor="#cbd5e1"
                                onValueChange={(v) => void saveNotification('planLimitAlertEnabled', v)}
                                thumbColor="#ffffff"
                                trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                                value={isExplorer ? true : !!s.planLimitAlertEnabled}
                            />
                        </View>
                        <View className="mx-4 h-px bg-slate-100" />
                        <ToggleRow
                            checked={!!s.weeklyEmailEnabled}
                            disabled={savingField === 'weeklyEmailEnabled'}
                            description="Weekly summary sent to your email"
                            onCheckedChange={(v) => void saveNotification('weeklyEmailEnabled', v)}
                            title="Weekly email summary"
                        />
                    </View>
                </View>

                <Button onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
            </ScrollView>
        </SafeAreaView>
    );
}

function ToggleRow({
    checked,
    disabled,
    description,
    onCheckedChange,
    title,
}: {
    checked: boolean;
    disabled: boolean;
    description?: string;
    onCheckedChange: (v: boolean) => void;
    title: string;
}) {
    return (
        <View className={`flex-row items-center justify-between px-4 py-3.5 ${disabled ? 'opacity-60' : ''}`}>
            <View className="flex-1 pr-4">
                <Text className="text-sm font-semibold text-slate-800">{title}</Text>
                {description ? <Text className="mt-0.5 text-xs text-slate-500">{description}</Text> : null}
            </View>
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

function ReminderTimeInput({ defaultValue, onSave, saving }: { defaultValue: string; onSave: (v: string) => void; saving: boolean }) {
    const [draft, setDraft] = useState(defaultValue);
    useEffect(() => { setDraft(defaultValue); }, [defaultValue]);

    return (
        <TextInput
            className={`rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 ${saving ? 'opacity-60' : ''}`}
            editable={!saving}
            maxLength={10}
            onBlur={() => { if (draft !== defaultValue) onSave(draft); }}
            onChangeText={setDraft}
            placeholder="HH:MM (e.g. 08:00)"
            value={draft}
        />
    );
}
