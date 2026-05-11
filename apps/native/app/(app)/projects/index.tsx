import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight01Icon, RefreshIcon } from 'hugeicons-react-native';

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

    async function loadTemplates() {
        setTemplatesLoading(true);
        setTemplatesError(null);

        try {
            const response = await nativeApiFetch<ProjectTemplateDefinition[]>(ROUTES.PROJECTS.TEMPLATES);
            setTemplates(response);
        } catch {
            setTemplatesError('Templates could not load right now.');
        } finally {
            setTemplatesLoading(false);
        }
    }

    useEffect(() => {
        void loadTemplates();
    }, []);

    const { data, error, isAuthenticated, loading, refetch } = usePagePayload<ProjectsContent>(ROUTES.PROJECTS.PAYLOAD);

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
                            onPress={() => {
                                refetch();
                                void loadTemplates();
                            }}
                        />
                    </View>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Template gallery</Text>
                            <Text className="mt-2 text-lg font-semibold text-slate-900">Start a new project document</Text>
                            <Text className="mt-1 text-sm text-slate-600">
                                Choose a template with the right level, subject, and marks for your next submission.
                            </Text>
                        </View>
                    </View>

                    {templatesLoading ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingTop: 12, gap: 10, paddingRight: 8 }}
                        >
                            {Array.from({ length: 4 }).map((_, index) => (
                                <View className="h-64 w-52 rounded-2xl border border-slate-200 bg-slate-100" key={`template-loading-${index}`} />
                            ))}
                        </ScrollView>
                    ) : null}

                    {!templatesLoading && templatesError ? (
                        <View className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                            <Text className="text-sm text-slate-600">{templatesError}</Text>
                            <View className="mt-3 self-start">
                                <Button title="Try again" variant="secondary" onPress={() => void loadTemplates()} />
                            </View>
                        </View>
                    ) : null}

                    {!templatesLoading && !templatesError && templates.length === 0 ? (
                        <View className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                            <Text className="text-sm text-slate-600">No templates are available yet.</Text>
                        </View>
                    ) : null}

                    {!templatesLoading && !templatesError && templates.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingTop: 12, gap: 10, paddingRight: 8 }}
                        >
                            {templates.map((template) => {
                                const stepPreview = template.steps.slice(0, 3);
                                const remainingCount = Math.max(template.steps.length - stepPreview.length, 0);

                                return (
                                    <View className="w-56 rounded-2xl border border-slate-200 bg-white p-3" key={template.id}>
                                        <View className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                            <View className="h-28 rounded-lg border border-slate-200 bg-white p-2.5">
                                                <View className={`h-1.5 w-16 rounded-full ${levelAccent(template.level)}`} />
                                                <View className="mt-3 h-1.5 w-24 rounded-full bg-slate-200" />
                                                <View className="mt-2 h-1.5 w-20 rounded-full bg-slate-200" />
                                                <View className="mt-4 h-1.5 w-28 rounded-full bg-slate-200" />
                                            </View>
                                        </View>

                                        <Text className="mt-3 text-sm font-semibold text-slate-900" numberOfLines={2}>{template.name}</Text>
                                        <Text className="mt-1 text-xs text-slate-600">{template.subject} • {formatLevel(template.level)}</Text>
                                        <Text className="mt-1 text-xs font-semibold text-slate-500">{template.totalMarks} marks</Text>

                                        <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                            <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Section flow</Text>
                                            <View className="mt-2 gap-1">
                                                {stepPreview.map((step) => (
                                                    <Text className="text-xs text-slate-700" key={step.key} numberOfLines={1}>• {step.title}</Text>
                                                ))}
                                            </View>
                                            {remainingCount > 0 ? (
                                                <Text className="mt-1.5 text-[11px] font-semibold text-slate-500">+{remainingCount} more sections</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
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

function formatLevel(level: ProjectLevel): string {
    if (level === 'grade7') return 'Grade 7';
    if (level === 'olevel') return 'O Level';
    return 'A Level';
}

function levelAccent(level: ProjectLevel): string {
    if (level === 'grade7') return 'bg-sky-500';
    if (level === 'olevel') return 'bg-amber-500';
    return 'bg-indigo-500';
}
