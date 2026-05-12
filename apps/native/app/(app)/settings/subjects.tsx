import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { UserSubject } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { formatRelativeDate } from '@/lib/formatters';
import { NativeAuthError, nativeApiFetch } from '@/lib/native-api';

interface AvailableSubject {
    id: string;
    name: string;
}

export default function SubjectsScreen() {
    const router = useRouter();
    const [availableSubjects, setAvailableSubjects] = useState<AvailableSubject[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<UserSubject[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requestVersion, setRequestVersion] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadSubjects() {
            setLoading(true);
            setError(null);

            try {
                const [all, mine] = await Promise.all([
                    nativeApiFetch<AvailableSubject[]>(ROUTES.SUBJECTS.LIST, { skipAuth: true }),
                    nativeApiFetch<UserSubject[]>(ROUTES.SUBJECTS.MINE),
                ]);

                if (cancelled) return;

                setAvailableSubjects(all);
                setSelectedSubjects(mine.slice().sort((left, right) => left.priorityIndex - right.priorityIndex));
                setStatusMessage('Live subjects loaded.');
            } catch (loadError) {
                if (cancelled) return;
                setError(loadError instanceof Error ? loadError : new Error('Could not load subjects.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadSubjects();
        return () => {
            cancelled = true;
        };
    }, [requestVersion]);

    const unselectedSubjects = useMemo(() => {
        const selectedIds = new Set(selectedSubjects.map((subject) => subject.subjectId));
        return availableSubjects.filter((subject) => !selectedIds.has(subject.id));
    }, [availableSubjects, selectedSubjects]);

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error) {
        const isAuthError = error instanceof NativeAuthError;

        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        actionTitle={isAuthError ? 'Back to home' : 'Try again'}
                        badge={isAuthError ? 'Sign in required' : 'Subjects failed to load'}
                        description={error.message}
                        onActionPress={isAuthError ? () => router.push('/(app)/(home)') : () => setRequestVersion((v) => v + 1)}
                        title="Subject settings unavailable"
                        tone="warning"
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, paddingTop: 24, gap: 24 }}>
                <View className="rounded-[32px] bg-[rgb(248,251,255)] p-6 shadow-sm">
                    <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">Subjects</Text>
                    <Text className="mt-3 text-3xl font-semibold text-slate-900">Manage your learning stack</Text>
                    <Text className="mt-3 text-base leading-7 text-slate-600">
                        Add, remove, and reorder subjects with live backend updates.
                    </Text>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Your selected subjects</Text>
                    <View className="mt-5 gap-4">
                        {selectedSubjects.length ? selectedSubjects.map((subject, index) => (
                            <View className="rounded-[24px] bg-slate-50 p-4" key={subject.subjectId}>
                                <Text className="text-lg font-semibold text-slate-900">{subject.name}</Text>
                                <Text className="mt-1 text-sm leading-6 text-slate-600">
                                    Priority #{index + 1} • {subject.strengthLevel.replace('_', ' ')} • Last active {formatRelativeDate(subject.lastActiveAt)}
                                </Text>
                                <View className="mt-4 flex-row flex-wrap gap-2">
                                    <Button
                                        disabled={saving || index === 0}
                                        onPress={() => void moveSubject(subject.subjectId, 'up')}
                                        title="Move up"
                                        variant="secondary"
                                    />
                                    <Button
                                        disabled={saving || index === selectedSubjects.length - 1}
                                        onPress={() => void moveSubject(subject.subjectId, 'down')}
                                        title="Move down"
                                        variant="secondary"
                                    />
                                    <Button
                                        disabled={saving}
                                        onPress={() => void removeSubject(subject.subjectId)}
                                        title="Remove"
                                        variant="danger"
                                    />
                                </View>
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                No subjects selected yet.
                            </Text>
                        )}
                    </View>
                </View>

                <View className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">Available subjects</Text>
                    <View className="mt-5 gap-4">
                        {unselectedSubjects.length ? unselectedSubjects.map((subject) => (
                            <View className="rounded-[24px] bg-slate-50 p-4" key={subject.id}>
                                <Text className="text-lg font-semibold text-slate-900">{subject.name}</Text>
                                <Button
                                    className="mt-4 self-start"
                                    disabled={saving}
                                    onPress={() => void addSubject(subject.id)}
                                    title="Add subject"
                                    variant="secondary"
                                />
                            </View>
                        )) : (
                            <Text className="text-base leading-7 text-slate-600">
                                You have already selected every available subject.
                            </Text>
                        )}
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

    async function addSubject(subjectId: string) {
        setSaving(true);
        setStatusMessage('Adding subject...');

        try {
            const updated = await nativeApiFetch<UserSubject[]>(ROUTES.SUBJECTS.ADD, {
                method: 'POST',
                body: JSON.stringify({ subjects: [subjectId] }),
            });
            setSelectedSubjects(updated);
            setStatusMessage('Subject added.');
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not add subject.');
        } finally {
            setSaving(false);
        }
    }

    async function removeSubject(subjectId: string) {
        setSaving(true);
        setStatusMessage('Removing subject...');

        try {
            const updated = await nativeApiFetch<UserSubject[]>(ROUTES.SUBJECTS.REMOVE(subjectId), {
                method: 'DELETE',
            });
            setSelectedSubjects(updated);
            setStatusMessage('Subject removed.');
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not remove subject.');
        } finally {
            setSaving(false);
        }
    }

    async function moveSubject(subjectId: string, direction: 'up' | 'down') {
        const currentIndex = selectedSubjects.findIndex((subject) => subject.subjectId === subjectId);
        if (currentIndex < 0) {
            return;
        }

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= selectedSubjects.length) {
            return;
        }

        const reordered = selectedSubjects.slice();
        const [moved] = reordered.splice(currentIndex, 1);
        reordered.splice(targetIndex, 0, moved);

        const order = reordered.map((subject) => subject.subjectId);

        setSaving(true);
        setStatusMessage('Saving order...');

        try {
            const updated = await nativeApiFetch<UserSubject[]>(ROUTES.SUBJECTS.REORDER, {
                method: 'PATCH',
                body: JSON.stringify({ order }),
            });
            setSelectedSubjects(updated);
            setStatusMessage('Subject order saved.');
        } catch (saveError) {
            setStatusMessage(saveError instanceof Error ? saveError.message : 'Could not reorder subjects.');
        } finally {
            setSaving(false);
        }
    }
}
