import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft01Icon, Download04Icon, Edit01Icon, RefreshIcon } from 'hugeicons-react-native';
import * as Linking from 'expo-linking';

import { ROUTES } from '@lernard/routes';
import type { ProjectContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { nativeApiFetch } from '@/lib/native-api';

interface ProjectDownloadResponse {
    fileName: string;
    downloadUrl: string;
}

interface EditableSection {
    key: string;
    title: string;
    body: string;
}

export default function ProjectDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId: string }>();
    const projectId = typeof params.projectId === 'string' ? params.projectId : '';

    const [project, setProject] = useState<ProjectContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editSections, setEditSections] = useState<EditableSection[]>([]);

    const loadProject = useCallback(async () => {
        if (!projectId) {
            setError('Project ID is missing.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const detail = await nativeApiFetch<ProjectContent>(ROUTES.PROJECTS.GET(projectId));
            setProject(detail);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Could not load this project.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!project || (project.status !== 'queued' && project.status !== 'processing')) {
            return;
        }

        const interval = setInterval(() => {
            void loadProject();
        }, 4000);

        return () => clearInterval(interval);
    }, [loadProject, project]);

    const canUsePdfActions = useMemo(
        () => Boolean(project && project.status === 'ready' && project.pdfReadyAt),
        [project],
    );

    function openEditor() {
        if (!project) {
            return;
        }

        setEditTitle(project.title);
        setEditSections(project.sections.map((section) => ({ ...section })));
        setIsEditOpen(true);
    }

    function updateSection(index: number, key: 'title' | 'body', value: string) {
        setEditSections((current) =>
            current.map((section, currentIndex) =>
                currentIndex === index ? { ...section, [key]: value } : section,
            ),
        );
    }

    async function downloadPdf() {
        if (!project) {
            return;
        }

        setDownloading(true);
        try {
            const download = await nativeApiFetch<ProjectDownloadResponse>(ROUTES.PROJECTS.DOWNLOAD_PDF(project.projectId));
            await Linking.openURL(download.downloadUrl);
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : 'Could not open PDF download.');
        } finally {
            setDownloading(false);
        }
    }

    async function saveEditedPdf() {
        if (!project) {
            return;
        }

        setSavingEdit(true);
        try {
            const nextProject = await nativeApiFetch<ProjectContent>(ROUTES.PROJECTS.EDIT_PDF(project.projectId), {
                method: 'PATCH',
                body: JSON.stringify({
                    title: editTitle,
                    sections: editSections,
                }),
            });

            setProject(nextProject);
            setIsEditOpen(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Could not save PDF edits.');
        } finally {
            setSavingEdit(false);
        }
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !project) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="px-4 py-6">
                    <StateNotice
                        badge="Project unavailable"
                        title="Could not load this project"
                        description={error ?? 'Please try again.'}
                        tone="warning"
                        actionTitle="Try again"
                        onActionPress={() => void loadProject()}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Modal animationType="slide" visible={isEditOpen} onRequestClose={() => setIsEditOpen(false)}>
                <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                    <View className="flex-row items-center justify-between border-b border-slate-200 px-4 pb-3 pt-2">
                        <Text className="text-lg font-semibold text-slate-900">Edit PDF</Text>
                        <Pressable onPress={() => setIsEditOpen(false)}>
                            <Text className="text-sm font-semibold text-slate-600">Close</Text>
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 14, gap: 12 }}>
                        <View className="rounded-2xl border border-slate-200 bg-white p-4">
                            <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Project title</Text>
                            <TextInput
                                className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                                maxLength={200}
                                onChangeText={setEditTitle}
                                value={editTitle}
                            />
                        </View>

                        {editSections.map((section, index) => (
                            <View className="rounded-2xl border border-slate-200 bg-white p-4" key={section.key}>
                                <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{section.key}</Text>
                                <TextInput
                                    className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                                    maxLength={140}
                                    onChangeText={(value) => updateSection(index, 'title', value)}
                                    value={section.title}
                                />
                                <TextInput
                                    className="mt-2 min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 align-top text-slate-900"
                                    maxLength={4000}
                                    multiline
                                    onChangeText={(value) => updateSection(index, 'body', value)}
                                    textAlignVertical="top"
                                    value={section.body}
                                />
                            </View>
                        ))}

                        <Button title={savingEdit ? 'Saving...' : 'Save PDF edits'} onPress={() => void saveEditedPdf()} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16, gap: 14 }}>
                <View className="flex-row items-center gap-3">
                    <Pressable
                        className="h-9 w-9 items-center justify-center rounded-full bg-slate-200"
                        hitSlop={8}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft01Icon color="#475569" size={18} strokeWidth={1.8} />
                    </Pressable>
                    <Text className="text-lg font-semibold text-slate-900">Project detail</Text>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-2xl font-semibold text-slate-900">{project.title}</Text>
                    <Text className="mt-1 text-sm text-slate-600">{project.templateName} • {project.subject}</Text>
                    <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status: {project.status}</Text>

                    <View className="mt-4 gap-3">
                        <Button
                            title={downloading ? 'Downloading...' : 'Download PDF'}
                            iconLeft={<Download04Icon color="#FFFFFF" size={16} strokeWidth={1.9} />}
                            onPress={() => void downloadPdf()}
                            disabled={!canUsePdfActions || downloading}
                        />
                        <Button
                            title="Edit PDF"
                            variant="secondary"
                            iconLeft={<Edit01Icon color="#0F172A" size={16} strokeWidth={1.9} />}
                            onPress={openEditor}
                            disabled={!canUsePdfActions}
                        />
                        <Button
                            title="Go to projects"
                            variant="ghost"
                            onPress={() => router.push('/(app)/projects')}
                        />
                        <Button
                            title="Refresh"
                            variant="ghost"
                            iconLeft={<RefreshIcon color="#475569" size={16} strokeWidth={1.9} />}
                            onPress={() => void loadProject()}
                        />
                    </View>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-lg font-semibold text-slate-900">Sections</Text>
                    <View className="mt-3 gap-3">
                        {project.sections.map((section) => (
                            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={section.key}>
                                <Text className="text-sm font-semibold text-slate-900">{section.title}</Text>
                                <Text className="mt-2 text-sm leading-6 text-slate-600">{section.body}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
