import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { ChildCompanionContent, CompanionControls } from '@lernard/shared-types';
import { useEffect, useState } from 'react';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { StateNotice } from '@/components/StateNotice';
import { ToggleRow } from '@/components/ToggleRow';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatRelativeDate } from '@/lib/formatters';
import { nativeApiFetch } from '@/lib/native-api';

export default function ChildCompanionScreen() {
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildCompanionContent>(
        ROUTES.GUARDIAN.CHILD_COMPANION_PAYLOAD(childId),
    );
    const [controls, setControls] = useState<CompanionControls | null>(null);
    const [savedControls, setSavedControls] = useState<CompanionControls | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Changes have not been saved yet.');

    useEffect(() => {
        if (!data?.content.controls) {
            return;
        }

        setControls(data.content.controls);
        setSavedControls(data.content.controls);
        setStatusMessage('Live companion controls loaded.');
    }, [data]);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        description="Lernard can only load and save live companion settings once the guardian session is active."
                        title="Companion controls need your guardian session"
                        tone="warm"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading || !controls || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Loading"
                        description="Pulling the current support settings for this learner from the live guardian endpoint."
                        title="Loading companion controls"
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
                        title="Companion controls could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const hasUnsavedChanges = Boolean(
        savedControls
        && (
            savedControls.showCorrectAnswers !== controls.showCorrectAnswers
            || savedControls.allowHints !== controls.allowHints
            || savedControls.allowSkip !== controls.allowSkip
        ),
    );

    const childName = data.content.child.name;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Companion controls</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Adjust {childName}'s support settings</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Tune how much help this learner receives during lessons and quizzes. Use these guardrails when you want support to feel calmer, firmer, or more independent.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                Last updated {formatRelativeDate(controls.lastChangedAt)}
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                Last changed by {controls.lastChangedBy}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-6 flex-row flex-wrap gap-3">
                        <Button
                            disabled={!hasUnsavedChanges || isSaving}
                            onPress={saveChanges}
                            title={isSaving ? 'Saving...' : 'Save changes'}
                        />
                        <Button onPress={resetDefaults} title="Reset defaults" variant="secondary" />
                    </View>
                </View>

                <View className="gap-4">
                    <ToggleRow
                        checked={controls.showCorrectAnswers}
                        description="Leave this on when you want quick reassurance after mistakes, or switch it off to keep reflection slower and more deliberate."
                        onCheckedChange={(value) => updateControl('showCorrectAnswers', value)}
                        title="Show correct answers"
                    />
                    <ToggleRow
                        checked={controls.allowHints}
                        description="Hints give a prompt before the full answer. Good when confidence is low but persistence is still the goal."
                        onCheckedChange={(value) => updateControl('allowHints', value)}
                        title="Allow hints"
                    />
                    <ToggleRow
                        checked={controls.allowSkip}
                        description="Skipping can protect momentum, but locking it keeps learners sitting with the hard parts a little longer."
                        onCheckedChange={(value) => updateControl('allowSkip', value)}
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

    function updateControl(key: 'showCorrectAnswers' | 'allowHints' | 'allowSkip', value: boolean) {
        setControls((current) => {
            const nextControls = ensureControls(current);

            return {
                ...nextControls,
                [key]: value,
            };
        });
        setStatusMessage('Changes staged locally. Save when you are ready.');
    }

    async function saveChanges() {
        if (!controls) {
            return;
        }

        setIsSaving(true);
        setStatusMessage('Saving live changes to Lernard...');

        try {
            const updatedControls = await nativeApiFetch<CompanionControls>(
                ROUTES.GUARDIAN.CHILD_COMPANION_CONTROLS(childId),
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        showCorrectAnswers: controls.showCorrectAnswers,
                        allowHints: controls.allowHints,
                        allowSkip: controls.allowSkip,
                    }),
                },
            );

            setControls(updatedControls);
            setSavedControls(updatedControls);
            setStatusMessage('Companion controls updated for this child.');
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Something interrupted the save.');
        } finally {
            setIsSaving(false);
        }
    }

    function resetDefaults() {
        setControls({
            ...ensureControls(controls),
            showCorrectAnswers: true,
            allowHints: true,
            allowSkip: false,
        });
        setStatusMessage('Controls reset to the recommended default mix.');
    }
}

function ensureControls(controls: CompanionControls | null) {
    return controls ?? {
        showCorrectAnswers: true,
        allowHints: true,
        allowSkip: false,
        lockedByGuardian: true,
        lastChangedAt: new Date().toISOString(),
        lastChangedBy: 'Guardian',
    };
}
