import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { CompanionControls, SettingsContent, UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { ToggleRow } from '@/components/ToggleRow';
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

    const controls = ensureCompanionControls(settings.companionControls);
    const locked = controls.lockedByGuardian || data.content.lockedSettings.includes('companion-controls');

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Companion controls</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">How much help appears during sessions</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        These defaults apply to your own sessions and save live.
                    </Text>
                </View>

                <View className="gap-4">
                    <ToggleRow
                        checked={controls.showCorrectAnswers}
                        description="Show full correct answers after a miss."
                        disabled={locked || isSaving}
                        onCheckedChange={(value) => void updateControls({ ...controls, showCorrectAnswers: value })}
                        title="Show correct answers"
                    />
                    <ToggleRow
                        checked={controls.allowHints}
                        description="Allow hints before full answers."
                        disabled={locked || isSaving}
                        onCheckedChange={(value) => void updateControls({ ...controls, allowHints: value })}
                        title="Allow hints"
                    />
                    <ToggleRow
                        checked={controls.allowSkip}
                        description="Allow skipping difficult questions."
                        disabled={locked || isSaving}
                        onCheckedChange={(value) => void updateControls({ ...controls, allowSkip: value })}
                        title="Allow skip"
                    />
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
                    showCorrectAnswers: nextControls.showCorrectAnswers,
                    allowHints: nextControls.allowHints,
                    allowSkip: nextControls.allowSkip,
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

function ensureCompanionControls(controls: CompanionControls | null): CompanionControls {
    if (controls) {
        return controls;
    }

    return {
        showCorrectAnswers: true,
        allowHints: true,
        allowSkip: true,
        lockedByGuardian: false,
        lastChangedAt: new Date(0).toISOString(),
        lastChangedBy: 'System',
    };
}
