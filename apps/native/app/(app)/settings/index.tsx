import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import {
    Appearance,
    LearningMode,
    type CompanionControls,
    type SettingsContent,
    type UserSettings,
} from '@lernard/shared-types';
import { useEffect, useState } from 'react';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { ToggleRow } from '@/components/ToggleRow';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize, formatDepthLabel } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

export default function SettingsScreen() {
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(
        ROUTES.SETTINGS.PAYLOAD,
    );
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [lockedSettings, setLockedSettings] = useState<string[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Changes have not been saved yet.');

    useEffect(() => {
        if (!data?.content) {
            return;
        }

        setSettings(data.content.settings);
        setLockedSettings(data.content.lockedSettings);
        setStatusMessage('Live settings loaded.');
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

    if (loading || !settings) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Loading"
                        description="Pulling your live learning mode, appearance, daily goal, and companion defaults."
                        title="Loading settings"
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
                        title="Settings could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const permissions = data?.permissions ?? [];
    const canEditMode = can(permissions, 'can_edit_mode') && !isLocked(lockedSettings, 'mode');
    const canEditAppearance = !isLocked(lockedSettings, 'appearance');
    const canEditDailyGoal = !isLocked(lockedSettings, 'daily-goal');
    const companionControls = ensureCompanionControls(settings.companionControls);
    const companionControlsLocked = companionControls.lockedByGuardian || isLocked(lockedSettings, 'companion-controls');

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Settings</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Shape how Lernard shows up for you</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Fine-tune how Lernard teaches, looks, and nudges you through each study session.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                {capitalize(settings.learningMode)} mode
                            </Text>
                        </View>
                        <View className="rounded-full bg-sky-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                {capitalize(settings.appearance)} appearance
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                Goal {settings.dailyGoal} sessions
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Learning mode</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Choose whether Lernard takes the lead or stays beside you with a lighter touch.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-3">
                        {([LearningMode.GUIDE, LearningMode.COMPANION] as const).map((mode) => (
                            <Button
                                disabled={!canEditMode || savingField === 'mode'}
                                key={mode}
                                onPress={() => updateMode(mode)}
                                title={capitalize(mode)}
                                variant={settings.learningMode === mode ? 'primary' : 'secondary'}
                            />
                        ))}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Appearance</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Match Lernard to your preferred light, dark, or system appearance.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-3">
                        {([Appearance.LIGHT, Appearance.DARK, Appearance.SYSTEM] as const).map((appearance) => (
                            <Button
                                disabled={!canEditAppearance || savingField === 'appearance'}
                                key={appearance}
                                onPress={() => updateAppearance(appearance)}
                                title={capitalize(appearance)}
                                variant={settings.appearance === appearance ? 'primary' : 'secondary'}
                            />
                        ))}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Daily goal</Text>
                    <Text className="mt-2 text-base leading-7 text-slate-600">
                        Adjust the number of focused sessions you want to complete each day.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap items-center gap-3">
                        <Button
                            disabled={!canEditDailyGoal || savingField === 'daily-goal' || settings.dailyGoal <= 1}
                            onPress={() => updateDailyGoal(settings.dailyGoal - 1)}
                            title="-1"
                            variant="secondary"
                        />
                        <View className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                            <Text className="text-base font-semibold text-slate-900">{settings.dailyGoal} sessions</Text>
                        </View>
                        <Button
                            disabled={!canEditDailyGoal || savingField === 'daily-goal' || settings.dailyGoal >= 10}
                            onPress={() => updateDailyGoal(settings.dailyGoal + 1)}
                            title="+1"
                        />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Session defaults</Text>
                    <View className="mt-5 gap-3">
                        <Text className="text-base leading-7 text-slate-600">Preferred depth: {formatDepthLabel(settings.preferredDepth)}</Text>
                        <Text className="text-base leading-7 text-slate-600">
                            Preferred session length: {settings.preferredSessionLength ? `${settings.preferredSessionLength} minutes` : 'Flexible'}
                        </Text>
                        <Text className="text-base leading-7 text-slate-600">
                            Notifications: {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </Text>
                    </View>
                </View>

                <View className="gap-4">
                    <ToggleRow
                        checked={companionControls.showCorrectAnswers}
                        description="Show the correct answer after a miss when you want feedback to feel direct and reassuring."
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        onCheckedChange={(value) => updateCompanionControl('showCorrectAnswers', value)}
                        title="Show correct answers"
                    />
                    <ToggleRow
                        checked={companionControls.allowHints}
                        description="Offer a hint before the full answer when you want to support persistence without giving too much away."
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        onCheckedChange={(value) => updateCompanionControl('allowHints', value)}
                        title="Allow hints"
                    />
                    <ToggleRow
                        checked={companionControls.allowSkip}
                        description="Let yourself skip when momentum matters more than sitting with one stuck point."
                        disabled={companionControlsLocked || savingField === 'companion-controls'}
                        onCheckedChange={(value) => updateCompanionControl('allowSkip', value)}
                        title="Allow skip"
                    />
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Update status</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">{statusMessage}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    async function updateMode(mode: LearningMode) {
        setSavingField('mode');
        setStatusMessage('Saving your learning mode...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.MODE, {
                method: 'PATCH',
                body: JSON.stringify({ mode }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Learning mode updated to ${capitalize(mode)}.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateAppearance(appearance: Appearance) {
        setSavingField('appearance');
        setStatusMessage('Saving your appearance preference...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.APPEARANCE, {
                method: 'PATCH',
                body: JSON.stringify({ appearance }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Appearance updated to ${capitalize(appearance)}.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateDailyGoal(dailyTarget: number) {
        setSavingField('daily-goal');
        setStatusMessage('Saving your daily goal...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.DAILY_GOAL, {
                method: 'PATCH',
                body: JSON.stringify({ dailyTarget }),
            });

            setSettings(nextSettings);
            setStatusMessage(`Daily goal updated to ${dailyTarget} sessions.`);
        } catch (saveError) {
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }

    async function updateCompanionControl(
        key: 'showCorrectAnswers' | 'allowHints' | 'allowSkip',
        value: boolean,
    ) {
        if (companionControlsLocked) {
            setStatusMessage('These companion controls are locked right now.');
            return;
        }

        const nextControls = {
            ...companionControls,
            [key]: value,
        };

        setSettings((current) => current ? {
            ...current,
            companionControls: nextControls,
        } : current);
        setSavingField('companion-controls');
        setStatusMessage('Saving your companion controls...');

        try {
            const savedControls = await nativeApiFetch<CompanionControls>(ROUTES.SETTINGS.COMPANION_CONTROLS, {
                method: 'PATCH',
                body: JSON.stringify({
                    showCorrectAnswers: nextControls.showCorrectAnswers,
                    allowHints: nextControls.allowHints,
                    allowSkip: nextControls.allowSkip,
                }),
            });

            setSettings((current) => current ? {
                ...current,
                companionControls: savedControls,
            } : current);
            setStatusMessage('Companion controls updated.');
        } catch (saveError) {
            setSettings((current) => current ? {
                ...current,
                companionControls,
            } : current);
            setStatusMessage(getErrorMessage(saveError));
        } finally {
            setSavingField(null);
        }
    }
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

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Something interrupted the save.';
}
