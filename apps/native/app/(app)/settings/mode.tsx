import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { can } from '@lernard/auth-core';
import { ROUTES } from '@lernard/routes';
import { LearningMode, type SettingsContent, type UserSettings } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { capitalize } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

export default function ModeScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!data?.content) {
            return;
        }

        setSettings(data.content.settings);
        setStatusMessage('Live learning mode loaded.');
    }, [data]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="A live session is required before Lernard can update your mode."
                        title="Mode settings need your session"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading || !settings || !data) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
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
                        title="Mode settings could not load"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const canEditMode = can(data.permissions, 'can_edit_mode') && !data.content.lockedSettings.includes('mode');

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Learning mode</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Choose how Lernard supports you</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Switch between Guide and Companion with live backend updates.
                    </Text>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            disabled={!canEditMode || isSaving}
                            onPress={() => void updateMode(LearningMode.GUIDE)}
                            title="Guide"
                            variant={settings.learningMode === LearningMode.GUIDE ? 'primary' : 'secondary'}
                        />
                        <Button
                            disabled={!canEditMode || isSaving}
                            onPress={() => void updateMode(LearningMode.COMPANION)}
                            title="Companion"
                            variant={settings.learningMode === LearningMode.COMPANION ? 'primary' : 'secondary'}
                        />
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Current mode</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        {capitalize(settings.learningMode)} mode is active.
                    </Text>
                    <Text className="mt-3 text-sm leading-6 text-slate-500">{statusMessage}</Text>
                    <Button className="mt-5 self-start" onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );

    async function updateMode(mode: LearningMode) {
        if (!canEditMode) {
            setStatusMessage('Mode is locked right now.');
            return;
        }

        setIsSaving(true);
        setStatusMessage('Saving mode...');

        try {
            const nextSettings = await nativeApiFetch<UserSettings>(ROUTES.SETTINGS.MODE, {
                method: 'PATCH',
                body: JSON.stringify({ mode }),
            });
            setSettings(nextSettings);
            setStatusMessage(`${capitalize(mode)} mode saved.`);
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not update mode.');
        } finally {
            setIsSaving(false);
        }
    }
}
