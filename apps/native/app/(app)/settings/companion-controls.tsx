import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { CompanionControls, SettingsContent, UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

export default function CompanionControlsScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!data?.content || data.content.roleView !== 'student') {
            setSettings(null);
            return;
        }

        setSettings(data.content.settings);
        setStatusMessage('Live companion controls loaded.');
    }, [data]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="A live session is required before companion controls can be changed."
                        title="Companion controls need your session"
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
                        badge="Live payload failed"
                        description={error.message}
                        onActionPress={refetch}
                        title="Companion controls could not load"
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
                        badge="Controls unavailable"
                        description="The settings payload was empty for this request."
                        onActionPress={refetch}
                        title="Could not open companion controls"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (data.content.roleView !== 'student') {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Open Household settings"
                        badge="Guardian view"
                        description="Companion defaults on this page are student-only. Manage child controls from household settings."
                        onActionPress={() => router.push('/settings')}
                        title="Companion defaults are student-only"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (!settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Back to settings"
                        badge="Controls unavailable"
                        description="Companion controls are not available for your current role."
                        onActionPress={() => router.push('/settings')}
                        title="Could not open companion controls"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const controls = settings.companionControls ?? {
        answerRevealTiming: 'after_quiz' as const,
        quizPassThreshold: 70,
        lockedByGuardian: false,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: 'You',
    };
    const locked = controls.lockedByGuardian || data.content.lockedSettings.includes('companion-controls');

    const THRESHOLD_OPTIONS = [50, 60, 70, 80, 90, 100];

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Companion controls</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">How sessions behave in Companion mode</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        These defaults apply to your own sessions and save live.
                    </Text>
                </View>

                {locked ? (
                    <View className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3">
                        <Text className="text-sm font-semibold text-amber-800">Locked by guardian</Text>
                        <Text className="mt-1 text-sm text-amber-700">Your guardian has locked these controls.</Text>
                    </View>
                ) : null}

                {/* Answer reveal timing */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Answer reveal timing</Text>
                    <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        {(['after_quiz', 'immediate'] as const).map((option, idx) => (
                            <View key={option}>
                                {idx > 0 ? <View className="mx-4 h-px bg-slate-100" /> : null}
                                <Pressable
                                    className={`flex-row items-center justify-between px-4 py-3.5 ${locked || isSaving ? 'opacity-60' : ''}`}
                                    disabled={locked || isSaving}
                                    onPress={() => void updateControls({ ...controls, answerRevealTiming: option })}
                                >
                                    <Text className="text-sm font-semibold text-slate-800">
                                        {option === 'after_quiz' ? 'After quiz' : 'Immediately'}
                                    </Text>
                                    {controls.answerRevealTiming === option ? (
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

                {/* Quiz pass threshold */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Quiz pass threshold</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {THRESHOLD_OPTIONS.map((pct) => (
                            <Pressable
                                className={`rounded-[14px] border px-4 py-2.5 ${
                                    controls.quizPassThreshold === pct
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${locked || isSaving ? 'opacity-60' : ''}`}
                                disabled={locked || isSaving}
                                key={pct}
                                onPress={() => void updateControls({ ...controls, quizPassThreshold: pct })}
                            >
                                <Text className={`text-sm font-semibold ${controls.quizPassThreshold === pct ? 'text-white' : 'text-slate-700'}`}>
                                    {pct}%
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Status</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">{statusMessage}</Text>
                    <Button className="mt-5 self-start" onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    async function updateControls(nextControls: CompanionControls) {
        if (locked) {
            setStatusMessage('Companion controls are locked right now.');
            return;
        }

        setIsSaving(true);
        setStatusMessage('Saving companion controls...');

        try {
            const saved = await nativeApiFetch<CompanionControls>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: 'PATCH',
                body: JSON.stringify({
                    answerRevealTiming: nextControls.answerRevealTiming,
                    quizPassThreshold: nextControls.quizPassThreshold,
                }),
            });

            setSettings((current) => current ? {
                ...current,
                companionControls: saved,
            } : current);
            setStatusMessage('Companion controls saved.');
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not update companion controls.');
        } finally {
            setIsSaving(false);
        }
    }
}
