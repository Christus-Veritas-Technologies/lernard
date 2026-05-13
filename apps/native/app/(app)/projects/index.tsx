import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight01Icon, RefreshIcon, SparklesIcon } from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import type { ProjectLevel, ProjectTemplateDefinition, ProjectsContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';
import { nativeApiFetch } from '@/lib/native-api';

export default function ProjectsScreen() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ProjectTemplateDefinition[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [templatesError, setTemplatesError] = useState<string | null>(null);
    const [activeLevel, setActiveLevel] = useState<ProjectLevel | 'all'>('all');

    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ProjectsContent>(ROUTES.PROJECTS.PAYLOAD);

    useEffect(() => {
        setTemplatesLoading(true);
        void nativeApiFetch<ProjectTemplateDefinition[]>(ROUTES.PROJECTS.TEMPLATES)
            .then((result) => {
                setTemplates(result);
                setTemplatesError(null);
            })
            .catch(() => setTemplatesError('Templates could not load right now.'))
            .finally(() => setTemplatesLoading(false));
    }, []);

    if (!isAuthenticated) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Sign in required"
                        title="Projects need your session"
                        description="Sign in to view generated projects and edit PDFs."
                        tone="warning"
                        actionTitle="Go to sign in"
                        onActionPress={() => router.push('/(auth)/login')}
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return <RoleFullScreenLoadingOverlay forceVisible />;
    }

    if (error || !data) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <View className="flex-1 px-4 pb-24 pt-6">
                    <StateNotice
                        badge="Load failed"
                        title="Projects could not load"
                        description={error?.message ?? 'Something interrupted the projects request.'}
                        tone="warning"
                        actionTitle="Try again"
                        onActionPress={refetch}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const { content } = data;
    const visibleTemplates = activeLevel === 'all'
        ? templates
        : templates.filter((template) => template.level === activeLevel);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16, gap: 14 }}>
                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</Text>
                    <Text className="mt-2 text-2xl font-semibold text-slate-900">Generated coursework hub</Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-600">
                        Track project status, open PDFs, and launch section edits.
                    </Text>
                    <View className="mt-4 flex-row gap-2">
                        <StatTile label="Total" value={content.totalProjects} />
                        <StatTile label="Ready" value={content.readyProjects} />
                        <StatTile label="Drafts" value={content.draftsInProgress} />
                    </View>
                    <View className="mt-4 self-start">
                        <Button
                            title="Refresh"
                            variant="secondary"
                            iconLeft={<RefreshIcon color="#334155" size={16} strokeWidth={1.9} />}
                            onPress={refetch}
                        />
                    </View>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-lg font-semibold text-slate-900">Start a new project</Text>
                    <Text className="mt-1 text-sm text-slate-600">
                        Enter your details and let Lernard generate a complete ZIMSEC project document for your level.
                    </Text>
                    <View className="mt-4 self-start">
                        <Button
                            title="New project"
                            iconLeft={<SparklesIcon color="#ffffff" size={16} strokeWidth={1.9} />}
                            onPress={() => router.push('/(app)/projects/create')}
                        />
                    </View>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-lg font-semibold text-slate-900">Project templates</Text>
                    <Text className="mt-1 text-sm text-slate-600">
                        Templates are optional. Pick one to enforce structure, or skip and let Lernard decide.
                    </Text>

                    <View className="mt-3 flex-row flex-wrap gap-2">
                        {([
                            { value: 'all', label: 'All levels' },
                            { value: 'grade7', label: 'Grade 7' },
                            { value: 'olevel', label: 'O Level' },
                            { value: 'alevel', label: 'A Level' },
                        ] as const).map((tab) => (
                            <Pressable
                                key={tab.value}
                                className={`rounded-full border px-3 py-1.5 ${
                                    activeLevel === tab.value
                                        ? 'border-primary-300 bg-primary-50'
                                        : 'border-slate-200 bg-white'
                                }`}
                                onPress={() => setActiveLevel(tab.value)}
                            >
                                <Text className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                    activeLevel === tab.value ? 'text-primary-700' : 'text-slate-600'
                                }`}>{tab.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {templatesLoading ? (
                        <View className="mt-4 gap-3">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <View className="h-24 rounded-2xl border border-slate-200 bg-slate-100" key={`template-loading-${index}`} />
                            ))}
                        </View>
                    ) : null}

                    {!templatesLoading && templatesError ? (
                        <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <Text className="text-sm text-rose-700">{templatesError}</Text>
                        </View>
                    ) : null}

                    {!templatesLoading && !templatesError && visibleTemplates.length > 0 ? (
                        <View className="mt-4 gap-3">
                            {visibleTemplates.map((template) => (
                                <Pressable
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    key={template.id}
                                    onPress={() => router.push(`/(app)/projects/create?template=${encodeURIComponent(template.id)}`)}
                                >
                                    <Text className="text-sm font-semibold text-slate-900">{template.name}</Text>
                                    <Text className="mt-1 text-xs text-slate-600">{formatTemplateLevel(template.level)} • {template.steps.length} sections</Text>
                                    <Text className="mt-2 text-xs leading-5 text-slate-600">{template.description}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-lg font-semibold text-slate-900">Recent projects</Text>
                    <Text className="mt-1 text-sm text-slate-600">Tap a project to download or edit its PDF.</Text>

                    <View className="mt-4 gap-3">
                        {content.recentProjects.length === 0 ? (
                            <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                <Text className="text-sm text-slate-600">No projects yet. Generate one first, then manage it here.</Text>
                            </View>
                        ) : (
                            content.recentProjects.map((project) => (
                                <Pressable
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    key={project.projectId}
                                    onPress={() => router.push(`/(app)/projects/${project.projectId}`)}
                                >
                                    <View className="flex-row items-center justify-between gap-3">
                                        <View className="flex-1">
                                            <Text className="text-sm font-semibold text-slate-900">{project.title}</Text>
                                            <Text className="mt-1 text-xs text-slate-600">
                                                {project.templateName} • {project.subject}
                                            </Text>
                                        </View>
                                        <ArrowRight01Icon color="#94A3B8" size={16} strokeWidth={1.8} />
                                    </View>
                                </Pressable>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function StatTile({ label, value }: { label: string; value: number }) {
    return (
        <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</Text>
            <Text className="mt-1 text-xl font-semibold text-slate-900">{value}</Text>
        </View>
    );
}

function formatTemplateLevel(level: ProjectLevel): string {
    if (level === 'grade7') {
        return 'Grade 7';
    }
    if (level === 'olevel') {
        return 'O Level';
    }
    return 'A Level';
}
