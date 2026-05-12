import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import { SessionDepth } from '@lernard/shared-types';
import type { SettingsContent, StudentSettingsContent, UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

const DEPTH_OPTIONS: { value: SessionDepth; label: string; description: string }[] = [
    { value: SessionDepth.QUICK, label: 'Quick', description: 'Short, focused sessions' },
    { value: SessionDepth.STANDARD, label: 'Standard', description: 'Balanced depth and length' },
    { value: SessionDepth.DEEP, label: 'Deep', description: 'Thorough, extended sessions' },
];

const SUPPORT_LEVELS: { value: string; label: string; description: string }[] = [
    { value: 'minimal', label: 'Minimal', description: 'Just the essentials' },
    { value: 'moderate', label: 'Moderate', description: 'Hints when stuck' },
    { value: 'full', label: 'Full', description: 'Step-by-step guidance' },
];

const SESSION_LENGTHS = [15, 20, 30, 45, 60];
const DAILY_GOAL_PRESETS = [1, 2, 3, 5];

export default function StudyScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);

    const content = data?.content?.roleView === 'student' ? (data.content as StudentSettingsContent) : null;

    useEffect(() => {
        if (content) {
            setSettings(content.settings);
            setLockedSettings(content.lockedSettings);
        }
    }, [content]);

    async function saveStudy(field: string, value: unknown) {
        setSavingField(field);
        try {
            await nativeApiFetch(ROUTES.SETTINGS.STUDY, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: value }),
            });
            setSettings((s) => s ? { ...s, [field]: value } : s);
        } catch {
            // silently revert — optimistic update, field will be set back on next load
            await refetch();
        } finally {
            setSavingField(null);
        }
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Sign in required" description="Sign in to edit study settings." title="Study unavailable" tone="warm" />
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
                        badge="Study settings failed to load"
                        description={error?.message ?? 'Something went wrong.'}
                        onActionPress={refetch}
                        title="Study settings unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const modeLocked = lockedSettings.includes('mode');

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <NativePageHeader
                    onBackPress={() => router.push('/settings')}
                    subtitle="Learning mode, depth, support level, and session length"
                    title="Study"
                />

                {/* Learning mode */}
                <View className="gap-2">
                    <View className="flex-row items-center justify-between px-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Learning mode</Text>
                        {modeLocked ? (
                            <View className="rounded-full bg-amber-100 px-2.5 py-0.5">
                                <Text className="text-xs font-semibold text-amber-700">Locked by guardian</Text>
                            </View>
                        ) : null}
                    </View>
                    <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        {(['guide', 'companion'] as const).map((mode, idx) => (
                            <View key={mode}>
                                {idx > 0 ? <View className="mx-4 h-px bg-slate-100" /> : null}
                                <Pressable
                                    className={`flex-row items-center justify-between px-4 py-3.5 ${modeLocked || savingField === 'learningMode' ? 'opacity-60' : ''}`}
                                    disabled={modeLocked || savingField === 'learningMode'}
                                    onPress={() => void saveStudy('learningMode', mode)}
                                >
                                    <Text className="text-sm font-semibold text-slate-800">{capitalize(mode)}</Text>
                                    {settings.learningMode === mode ? (
                                        <View className="h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
                                            <View className="h-2.5 w-2.5 rounded-full bg-white" />
                                        </View>
                                    ) : (
                                        <View className="h-5 w-5 rounded-full border-2 border-slate-300" />
                                    )}
                                </Pressable>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Session depth */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Session depth</Text>
                    <View className="gap-2">
                        {DEPTH_OPTIONS.map((opt) => (
                            <Pressable
                                className={`rounded-[18px] border p-4 ${
                                    settings.preferredDepth === opt.value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'preferredDepth' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'preferredDepth'}
                                key={opt.value}
                                onPress={() => void saveStudy('preferredDepth', opt.value)}
                            >
                                <Text className={`text-sm font-semibold ${settings.preferredDepth === opt.value ? 'text-indigo-700' : 'text-slate-800'}`}>
                                    {opt.label}
                                </Text>
                                <Text className="mt-0.5 text-xs text-slate-500">{opt.description}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Support level */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Support level</Text>
                    <View className="gap-2">
                        {SUPPORT_LEVELS.map((opt) => (
                            <Pressable
                                className={`rounded-[18px] border p-4 ${
                                    settings.supportLevel === opt.value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'supportLevel' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'supportLevel'}
                                key={opt.value}
                                onPress={() => void saveStudy('supportLevel', opt.value)}
                            >
                                <Text className={`text-sm font-semibold ${settings.supportLevel === opt.value ? 'text-indigo-700' : 'text-slate-800'}`}>
                                    {opt.label}
                                </Text>
                                <Text className="mt-0.5 text-xs text-slate-500">{opt.description}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Session length */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Session length (minutes)</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {SESSION_LENGTHS.map((len) => (
                            <Pressable
                                className={`rounded-[14px] border px-4 py-2.5 ${
                                    settings.preferredSessionLength === len
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'preferredSessionLength' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'preferredSessionLength'}
                                key={len}
                                onPress={() => void saveStudy('preferredSessionLength', len)}
                            >
                                <Text className={`text-sm font-semibold ${settings.preferredSessionLength === len ? 'text-white' : 'text-slate-700'}`}>
                                    {len}m
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Daily goal */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Daily goal (sessions)</Text>
                    <View className="flex-row items-center gap-3">
                        <Pressable
                            className={`h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white ${savingField === 'dailyGoal' ? 'opacity-60' : ''}`}
                            disabled={savingField === 'dailyGoal' || settings.dailyGoal <= 1}
                            onPress={() => void saveStudy('dailyGoal', settings.dailyGoal - 1)}
                        >
                            <Text className="text-lg font-semibold text-slate-700">−</Text>
                        </Pressable>
                        <View className="min-w-[48px] items-center">
                            <Text className="text-2xl font-semibold text-slate-900">{settings.dailyGoal}</Text>
                        </View>
                        <Pressable
                            className={`h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white ${savingField === 'dailyGoal' ? 'opacity-60' : ''}`}
                            disabled={savingField === 'dailyGoal' || settings.dailyGoal >= 20}
                            onPress={() => void saveStudy('dailyGoal', settings.dailyGoal + 1)}
                        >
                            <Text className="text-lg font-semibold text-slate-700">+</Text>
                        </Pressable>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {DAILY_GOAL_PRESETS.map((preset) => (
                            <Pressable
                                className={`rounded-[12px] border px-3 py-1.5 ${
                                    settings.dailyGoal === preset
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'dailyGoal' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'dailyGoal'}
                                key={preset}
                                onPress={() => void saveStudy('dailyGoal', preset)}
                            >
                                <Text className={`text-xs font-semibold ${settings.dailyGoal === preset ? 'text-white' : 'text-slate-600'}`}>
                                    {preset}×
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Companion controls link */}
                {settings.learningMode === 'companion' ? (
                    <View className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-sm font-semibold text-slate-800">Companion controls</Text>
                                <Text className="mt-0.5 text-xs text-slate-500">Answer reveal, pass threshold</Text>
                            </View>
                            <Button onPress={() => router.push('/settings/companion-controls')} title="Configure" variant="secondary" />
                        </View>
                    </View>
                ) : null}

                <Button onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
            </ScrollView>
        </SafeAreaView>
    );
}
