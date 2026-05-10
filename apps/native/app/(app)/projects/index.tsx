import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight01Icon, RefreshIcon } from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import type { ProjectsContent } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { StateNotice } from '@/components/StateNotice';
import { usePagePayload } from '@/hooks/usePagePayload';

export default function ProjectsScreen() {
    const router = useRouter();
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
                            onPress={refetch}
                        />
                    </View>
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
