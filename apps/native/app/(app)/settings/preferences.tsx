import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import { Appearance, type SettingsContent, type UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

export default function PreferencesScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!data?.content) {
            return;
        }

        setSettings(data.content.settings);
        setStatusMessage('Live preferences loaded.');
    }, [data]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="A live session is required before preference changes can be saved."
                        title="Preferences need your session"
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
                        title="Preferences could not load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (!data?.content || !settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Back to settings"
                        badge="Preferences unavailable"
                        description="Preference controls are not available for your current role."
                        onActionPress={() => router.push('/settings')}
                        title="Could not open preferences"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const appearanceLocked = data.content.lockedSettings.includes('appearance');
    const dailyGoalLocked = data.content.lockedSettings.includes('daily-goal');

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Preferences</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Appearance and daily rhythm</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Keep your visual theme and daily target synced to the backend.
                    </Text>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Appearance</Text>
                    <View className="mt-5 flex-row flex-wrap gap-3">
                        {[Appearance.LIGHT, Appearance.DARK, Appearance.SYSTEM].map((appearance) => (
                            <Button
                                disabled={appearanceLocked || savingField === 'appearance'}
                                key={appearance}
                                onPress={() => void updateAppearance(appearance)}
                                title={capitalize(appearance)}
                                variant={settings.appearance === appearance ? 'primary' : 'secondary'}
                            />
                        ))}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Daily goal</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">Adjust your daily session target.</Text>
                    <View className="mt-5 flex-row flex-wrap items-center gap-3">
                        <Button
                            disabled={dailyGoalLocked || savingField === 'daily-goal' || settings.dailyGoal <= 1}
                            onPress={() => void updateDailyGoal(settings.dailyGoal - 1)}
                            title="-1"
                            variant="secondary"
                        />
                        <View className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                            <Text className="text-base font-semibold text-slate-900">{settings.dailyGoal} sessions</Text>
                        </View>
                        <Button
                            disabled={dailyGoalLocked || savingField === 'daily-goal' || settings.dailyGoal >= 10}
                            onPress={() => void updateDailyGoal(settings.dailyGoal + 1)}
                            title="+1"
                        />
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

    async function updateAppearance(appearance: Appearance) {
        setSavingField('appearance');
        setStatusMessage('Saving appearance...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.APPEARANCE, {
                method: 'PATCH',
                body: JSON.stringify({ appearance }),
            });
            setSettings(nextSettings);
            setStatusMessage(`Appearance set to ${capitalize(appearance)}.`);
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not update appearance.');
        } finally {
            setSavingField(null);
        }
    }

    async function updateDailyGoal(dailyTarget: number) {
        setSavingField('daily-goal');
        setStatusMessage('Saving daily goal...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.DAILY_GOAL, {
                method: 'PATCH',
                body: JSON.stringify({ dailyTarget }),
            });
            setSettings(nextSettings);
            setStatusMessage(`Daily goal set to ${dailyTarget} sessions.`);
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not update daily goal.');
        } finally {
            setSavingField(null);
        }
    }
}
