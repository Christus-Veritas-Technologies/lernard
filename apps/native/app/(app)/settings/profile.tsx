import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { AgeGroup, LearningGoal, SettingsContent, StudentSettingsContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { NativePageHeader } from '@/components/NativePageHeader';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: AgeGroup.PRIMARY, label: 'Primary' },
    { value: AgeGroup.SECONDARY, label: 'Secondary' },
    { value: AgeGroup.UNIVERSITY, label: 'University' },
    { value: AgeGroup.PROFESSIONAL, label: 'Professional' },
];

const LEARNING_GOALS: { value: LearningGoal; label: string }[] = [
    { value: LearningGoal.EXAM_PREP, label: 'Exam prep' },
    { value: LearningGoal.KEEP_UP, label: 'Keep up' },
    { value: LearningGoal.LEARN_NEW, label: 'Learn new' },
    { value: LearningGoal.FILL_GAPS, label: 'Fill gaps' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<SettingsContent>(ROUTES.SETTINGS.PAYLOAD);
    const [nameDraft, setNameDraft] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const nameInitialised = useRef(false);

    const content = data?.content?.roleView === 'student' ? (data.content as StudentSettingsContent) : null;

    useEffect(() => {
        if (content?.viewer.name && !nameInitialised.current) {
            setNameDraft(content.viewer.name);
            nameInitialised.current = true;
        }
    }, [content]);

    async function onPickAvatar() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        const uri = asset.uri;
        const fileName = uri.split('/').pop() ?? 'avatar.jpg';
        const mimeType = asset.mimeType ?? 'image/jpeg';

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('file', { uri, name: fileName, type: mimeType } as any);
            await nativeApiFetch(ROUTES.SETTINGS.AVATAR_UPLOAD, { method: 'POST', body: formData });
            await refetch();
        } catch {
            // silently ignore upload errors
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function saveProfile(field: string, value: unknown) {
        setSavingField(field);
        try {
            await nativeApiFetch(ROUTES.SETTINGS.PROFILE, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: value }),
            });
            await refetch();
        } catch {
            // silently ignore — field will revert on next load
        } finally {
            setSavingField(null);
        }
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice badge="Sign in required" description="Sign in to edit your profile." title="Profile unavailable" tone="warm" />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) return <RoleFullScreenLoadingOverlay forceVisible />;

    if (error || !content) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle="Try again"
                        badge="Profile failed to load"
                        description={error?.message ?? 'Something went wrong.'}
                        onActionPress={refetch}
                        title="Profile unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { viewer } = content;

    const initials = viewer.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const showGrade = viewer.ageGroup === AgeGroup.SECONDARY || viewer.ageGroup === AgeGroup.UNIVERSITY;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-6">
                <NativePageHeader
                    onBackPress={() => router.push('/settings')}
                    subtitle="Update your name, age group, and learning preferences"
                    title="Profile"
                />

                {/* Avatar + name */}
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <TouchableOpacity
                        className="self-start"
                        disabled={uploadingAvatar}
                        onPress={() => void onPickAvatar()}
                    >
                        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-indigo-100">
                            <Text className="text-2xl font-semibold text-indigo-600">{initials}</Text>
                        </View>
                        <Text className="mt-2 text-xs text-indigo-500">
                            {uploadingAvatar ? 'Uploading...' : 'Tap to change'}
                        </Text>
                    </TouchableOpacity>

                    <View className="mt-4">
                        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Display name</Text>
                        <TextInput
                            className="rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            maxLength={50}
                            onBlur={() => {
                                const trimmed = nameDraft.trim();
                                if (trimmed && trimmed !== viewer.name) {
                                    void saveProfile('name', trimmed);
                                }
                            }}
                            onChangeText={setNameDraft}
                            value={nameDraft}
                        />
                    </View>

                    <View className="mt-3">
                        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</Text>
                        <View className="rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-3">
                            <Text className="text-sm text-slate-500">{viewer.email ?? '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Age group */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Age group</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AGE_GROUPS.map((opt) => (
                            <Pressable
                                className={`rounded-[14px] border px-4 py-2.5 ${
                                    viewer.ageGroup === opt.value
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'ageGroup' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'ageGroup'}
                                key={opt.value}
                                onPress={() => void saveProfile('ageGroup', opt.value)}
                            >
                                <Text className={`text-sm font-semibold ${viewer.ageGroup === opt.value ? 'text-white' : 'text-slate-700'}`}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Grade (conditional) */}
                {showGrade ? (
                    <View className="gap-2">
                        <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Year / grade</Text>
                        <GradeInput
                            defaultValue={viewer.grade ?? ''}
                            onSave={(v) => void saveProfile('grade', v)}
                            saving={savingField === 'grade'}
                        />
                    </View>
                ) : null}

                {/* Timezone */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Timezone</Text>
                    <TimezoneInput
                        defaultValue={viewer.timezone ?? ''}
                        onSave={(v) => void saveProfile('timezone', v)}
                        saving={savingField === 'timezone'}
                    />
                </View>

                {/* Learning goal */}
                <View className="gap-2">
                    <Text className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Learning goal</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {LEARNING_GOALS.map((opt) => (
                            <Pressable
                                className={`rounded-[14px] border px-4 py-2.5 ${
                                    viewer.learningGoal === opt.value
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-slate-200 bg-white'
                                } ${savingField === 'learningGoal' ? 'opacity-60' : ''}`}
                                disabled={savingField === 'learningGoal'}
                                key={opt.value}
                                onPress={() => void saveProfile('learningGoal', opt.value)}
                            >
                                <Text className={`text-sm font-semibold ${viewer.learningGoal === opt.value ? 'text-white' : 'text-slate-700'}`}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <Button onPress={() => router.push('/settings')} title="Back to settings" variant="ghost" />
            </ScrollView>
        </SafeAreaView>
    );
}

function GradeInput({ defaultValue, onSave, saving }: { defaultValue: string; onSave: (v: string) => void; saving: boolean }) {
    const [draft, setDraft] = useState(defaultValue);
    useEffect(() => { setDraft(defaultValue); }, [defaultValue]);

    return (
        <TextInput
            className={`rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 ${saving ? 'opacity-60' : ''}`}
            editable={!saving}
            maxLength={20}
            onBlur={() => { if (draft.trim() !== defaultValue) onSave(draft.trim()); }}
            onChangeText={setDraft}
            placeholder="e.g. Year 10"
            value={draft}
        />
    );
}

function TimezoneInput({ defaultValue, onSave, saving }: { defaultValue: string; onSave: (v: string) => void; saving: boolean }) {
    const [draft, setDraft] = useState(defaultValue);
    useEffect(() => { setDraft(defaultValue); }, [defaultValue]);

    return (
        <TextInput
            className={`rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 ${saving ? 'opacity-60' : ''}`}
            editable={!saving}
            maxLength={50}
            onBlur={() => { if (draft.trim() !== defaultValue) onSave(draft.trim()); }}
            onChangeText={setDraft}
            placeholder="e.g. Europe/London"
            value={draft}
        />
    );
}


