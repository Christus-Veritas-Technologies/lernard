import { useLocalSearchParams } from 'expo-router';
import { useRef, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Settings02Icon } from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import type { ChildCompanionContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { formatRelativeDate } from '@/lib/formatters';
import { nativeApiFetch, NativeApiError } from '@/lib/native-api';

const LOCKED_SETTINGS_OPTIONS = [
    { key: 'mode_toggle', label: 'Lock learning mode', description: 'Prevents switching between Guide and Companion' },
    { key: 'subject_manager', label: 'Lock subject manager', description: 'Prevents adding or removing subjects' },
    { key: 'companion_answer_reveal', label: 'Lock answer reveal timing', description: 'Prevents changing when answers are shown' },
] as const;

interface StagedControls {
    learningMode: 'guide' | 'companion';
    answerRevealTiming: 'after_quiz' | 'immediate';
    quizPassThreshold: number;
    lockedSettings: string[];
}

function clampThreshold(value: number): number {
    return Math.round(Math.min(Math.max(value, 0.5), 1.0) * 10) / 10;
}

export default function ChildCompanionScreen() {
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ChildCompanionContent>(
        ROUTES.GUARDIAN.CHILD_COMPANION_PAYLOAD(childId),
    );

    const [staged, setStaged] = useState<StagedControls | null>(null);
    const [saved, setSaved] = useState<StagedControls | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const passwordRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!data?.content.controls) return;
        const controls = data.content.controls as any;
        const initial: StagedControls = {
            learningMode: controls.learningMode ?? 'guide',
            answerRevealTiming: controls.answerRevealTiming ?? 'after_quiz',
            quizPassThreshold: controls.quizPassThreshold ?? 0.7,
            lockedSettings: controls.lockedSettings ?? [],
        };
        setStaged(initial);
        setSaved(initial);
    }, [data]);

    const hasUnsavedChanges = staged !== null && saved !== null && JSON.stringify(staged) !== JSON.stringify(saved);
    const childName = data?.content.child.name ?? 'this child';

    function toggleLockedSetting(key: string) {
        setStaged((prev) => {
            if (!prev) return prev;
            const current = prev.lockedSettings;
            return {
                ...prev,
                lockedSettings: current.includes(key)
                    ? current.filter((k) => k !== key)
                    : [...current, key],
            };
        });
    }

    function openPasswordModal() {
        setPassword('');
        setPasswordError('');
        setShowPasswordModal(true);
        setTimeout(() => passwordRef.current?.focus(), 100);
    }

    async function confirmSave() {
        if (!staged || !password.trim()) return;
        setIsSaving(true);
        setPasswordError('');

        try {
            await nativeApiFetch(ROUTES.AUTH.GUARDIAN_VERIFY_PASSWORD, {
                method: 'POST',
                body: JSON.stringify({ password }),
            });
        } catch {
            setPasswordError('Incorrect password. Please try again.');
            setIsSaving(false);
            return;
        }

        try {
            await nativeApiFetch(ROUTES.GUARDIAN.CHILD_COMPANION_CONTROLS(childId), {
                method: 'PATCH',
                body: JSON.stringify({
                    learningMode: staged.learningMode,
                    answerRevealTiming: staged.answerRevealTiming,
                    quizPassThreshold: staged.quizPassThreshold,
                    lockedSettings: staged.lockedSettings,
                }),
            });

            setSaved(staged);
            setShowPasswordModal(false);
            showToast(`Settings saved for ${childName}.`);
        } catch (saveErr) {
            const msg = saveErr instanceof NativeApiError ? saveErr.body : 'Something went wrong.';
            showToast(msg);
        } finally {
            setIsSaving(false);
        }
    }

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }

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

    if (loading || !staged || !data) {
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
                        title="Companion controls could not load right now"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const controls = data.content.controls as any;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128, paddingTop: 24, gap: 24 }}>
                {/* Header */}
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <View className="flex-row items-center gap-2">
                        <Settings02Icon color="#4F46E5" size={18} strokeWidth={1.8} />
                        <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Companion controls</Text>
                    </View>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Adjust {childName}'s settings</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Tune how {childName} learns — mode, answer timing, pass threshold, and which settings they can change.
                    </Text>
                    <View className="mt-5 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                Last updated {formatRelativeDate(controls.lastChangedAt)}
                            </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-3 py-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                By {controls.lastChangedBy}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Section 1: Learning Mode */}
                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm gap-4">
                    <Text className="text-xl font-semibold text-slate-900">Learning mode</Text>
                    <Text className="text-sm leading-6 text-slate-600">Which mode should {childName} use?</Text>
                    <ModeOption
                        label="Guide"
                        description={`Lernard nudges ${childName} toward answers using hints and examples.`}
                        selected={staged.learningMode === 'guide'}
                        onPress={() => setStaged((p) => p ? { ...p, learningMode: 'guide' } : p)}
                    />
                    <ModeOption
                        label="Companion"
                        description={`Lernard teaches the concept first, quizzes ${childName}, then reveals the answer.`}
                        selected={staged.learningMode === 'companion'}
                        onPress={() => setStaged((p) => p ? { ...p, learningMode: 'companion' } : p)}
                    />
                </View>

                {/* Section 2: Answer Reveal Timing (Companion only) */}
                {staged.learningMode === 'companion' && (
                    <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm gap-4">
                        <Text className="text-xl font-semibold text-slate-900">Answer reveal timing</Text>
                        <Text className="text-sm leading-6 text-slate-600">When should Lernard reveal the answer to {childName}?</Text>
                        <ModeOption
                            label="Only after the quiz is passed"
                            description={`${childName} must pass the quiz before seeing the answer. Recommended.`}
                            selected={staged.answerRevealTiming === 'after_quiz'}
                            onPress={() => setStaged((p) => p ? { ...p, answerRevealTiming: 'after_quiz' } : p)}
                        />
                        <ModeOption
                            label="Immediately after the concept breakdown"
                            description="The answer is shown after the explanation, before the quiz."
                            selected={staged.answerRevealTiming === 'immediate'}
                            onPress={() => setStaged((p) => p ? { ...p, answerRevealTiming: 'immediate' } : p)}
                        />
                    </View>
                )}

                {/* Section 3: Quiz Pass Threshold (Companion only) */}
                {staged.learningMode === 'companion' && (
                    <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm gap-4">
                        <Text className="text-xl font-semibold text-slate-900">Quiz pass threshold</Text>
                        <Text className="text-sm leading-6 text-slate-600">
                            {childName} must score at least this percentage to receive the answer.
                        </Text>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-slate-500">Minimum score</Text>
                            <Text className="text-2xl font-bold text-slate-900">
                                {Math.round(staged.quizPassThreshold * 100)}%
                            </Text>
                        </View>
                        <View className="flex-row gap-2 flex-wrap">
                            {[50, 60, 70, 80, 90, 100].map((pct) => {
                                const value = pct / 100;
                                const selected = Math.round(staged.quizPassThreshold * 100) === pct;
                                return (
                                    <Pressable
                                        key={pct}
                                        onPress={() => setStaged((p) => p ? { ...p, quizPassThreshold: value } : p)}
                                        className={`flex-1 min-w-[48px] items-center rounded-2xl py-3 ${selected ? 'bg-indigo-500' : 'bg-slate-100'}`}
                                    >
                                        <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>
                                            {pct}%
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <Text className="text-xs text-slate-400 text-center">70% recommended</Text>
                    </View>
                )}

                {/* Section 4: Locked Settings */}
                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm gap-4">
                    <Text className="text-xl font-semibold text-slate-900">Lock settings from {childName}</Text>
                    <Text className="text-sm leading-6 text-slate-600">
                        {childName} won't be able to change these in their own settings.
                    </Text>
                    {LOCKED_SETTINGS_OPTIONS.map((option) => {
                        const checked = staged.lockedSettings.includes(option.key);
                        return (
                            <Pressable
                                key={option.key}
                                onPress={() => toggleLockedSetting(option.key)}
                                className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                            >
                                <View className={`mt-0.5 h-5 w-5 rounded items-center justify-center ${checked ? 'bg-indigo-500' : 'border border-slate-300 bg-white'}`}>
                                    {checked && <Text className="text-white text-xs font-bold">✓</Text>}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-slate-900">{option.label}</Text>
                                    <Text className="mt-0.5 text-xs leading-5 text-slate-500">{option.description}</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Save */}
                <Button
                    disabled={!hasUnsavedChanges || isSaving}
                    onPress={openPasswordModal}
                    title="Save changes"
                />
            </ScrollView>

            {/* Toast */}
            {toast && (
                <View className="absolute bottom-12 left-6 right-6 rounded-[20px] bg-slate-900 px-5 py-4 shadow-lg">
                    <Text className="text-center text-sm font-medium text-white">{toast}</Text>
                </View>
            )}

            {/* Guardian Password Modal */}
            <Modal
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
                presentationStyle="pageSheet"
                transparent={false}
                visible={showPasswordModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 bg-background"
                >
                    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                        <View className="flex-1 px-6 pt-6 pb-8 gap-6">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-2xl font-bold text-slate-900">Confirm password</Text>
                                <Pressable onPress={() => setShowPasswordModal(false)} className="px-2 py-1">
                                    <Text className="text-base text-slate-500">Cancel</Text>
                                </Pressable>
                            </View>

                            <Text className="text-base leading-7 text-slate-600">
                                To protect {childName}'s settings, please enter your Lernard password.
                            </Text>

                            <View className="gap-2">
                                <Text className="text-sm font-semibold text-slate-900">Password</Text>
                                <TextInput
                                    ref={passwordRef}
                                    autoFocus
                                    onChangeText={(text) => { setPassword(text); setPasswordError(''); }}
                                    onSubmitEditing={confirmSave}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#94a3b8"
                                    returnKeyType="done"
                                    secureTextEntry
                                    value={password}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900"
                                />
                                {passwordError ? (
                                    <Text className="text-sm text-rose-600">{passwordError}</Text>
                                ) : null}
                            </View>

                            <Button
                                disabled={isSaving || !password.trim()}
                                onPress={confirmSave}
                                title={isSaving ? 'Saving...' : 'Confirm & save'}
                            />
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

interface ModeOptionProps {
    label: string;
    description: string;
    selected: boolean;
    onPress: () => void;
}

function ModeOption({ label, description, selected, onPress }: ModeOptionProps) {
    return (
        <Pressable
            onPress={onPress}
            className={`flex-row items-start gap-3 rounded-2xl border p-4 ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
        >
            <View className={`mt-0.5 h-5 w-5 rounded-full border-2 items-center justify-center ${selected ? 'border-indigo-500' : 'border-slate-300'}`}>
                {selected && <View className="h-2.5 w-2.5 rounded-full bg-indigo-500" />}
            </View>
            <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">{label}</Text>
                <Text className="mt-0.5 text-xs leading-5 text-slate-500">{description}</Text>
            </View>
        </Pressable>
    );
}
