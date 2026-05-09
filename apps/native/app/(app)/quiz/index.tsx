import { useRouter } from 'expo-router';
import {
  Clock01Icon,
  RefreshIcon,
  Rocket01Icon,
  SchoolReportCardIcon,
  SignalMedium02Icon,
} from 'hugeicons-react-native';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import type { QuizDashboardStats, QuizHistoryItem, QuizHistoryResponse } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/rnr/card';
import { nativeApiFetch } from '@/lib/native-api';

import { QuizCreateForm } from './QuizCreateForm';

const EMPTY_STATS: QuizDashboardStats = {
  quizzesThisMonth: 0,
  monthlyLimit: null,
  averageScoreThisMonth: null,
  quizzesInProgress: 0,
  growthAreasFlagged: 0,
  mostQuizzedSubject: null,
  mostCommonDifficulty: null,
};

export default function QuizDashboardScreen() {
  const router = useRouter();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [stats, setStats] = useState<QuizDashboardStats>(EMPTY_STATS);
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);

    try {
      const [statsData, historyData] = await Promise.all([
        nativeApiFetch<QuizDashboardStats>(ROUTES.QUIZZES.DASHBOARD_STATS),
        nativeApiFetch<QuizHistoryResponse>(`${ROUTES.QUIZZES.HISTORY}?limit=8`),
      ]);

      setStats(statsData);
      setHistory(historyData.quizzes);
      setHistoryCursor(historyData.nextCursor);
      setHistoryHasMore(historyData.hasMore);
    } catch {
      setDashboardError('Could not load your quiz dashboard yet.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function loadMoreHistory() {
    if (!historyHasMore || !historyCursor || historyLoadingMore) return;

    setHistoryLoadingMore(true);
    try {
      const nextPage = await nativeApiFetch<QuizHistoryResponse>(
        `${ROUTES.QUIZZES.HISTORY}?limit=8&cursor=${encodeURIComponent(historyCursor)}`,
      );
      setHistory((prev) => [...prev, ...nextPage.quizzes]);
      setHistoryCursor(nextPage.nextCursor);
      setHistoryHasMore(nextPage.hasMore);
    } finally {
      setHistoryLoadingMore(false);
    }
  }

  const monthlyUsageLabel =
    stats.monthlyLimit === null
      ? `${stats.quizzesThisMonth} quizzes this month`
      : `${stats.quizzesThisMonth} / ${stats.monthlyLimit} this month`;

  const avgScoreLabel =
    stats.averageScoreThisMonth === null
      ? 'No completed quizzes'
      : `${stats.averageScoreThisMonth.toFixed(1)} / 10 average`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-24 pt-6 gap-5">
        <Card className="rounded-[32px] border border-sky-100 bg-[rgb(244,249,255)] p-6">
          <CardHeader className="gap-2">
            <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Quiz Dashboard</Text>
            <CardTitle className="text-2xl">Build momentum with targeted practice</CardTitle>
            <Text className="text-sm leading-6 text-slate-600">
              Check your progress, review history, and launch a new quiz only when you choose to.
            </Text>
          </CardHeader>
          <CardContent className="mt-1 gap-3">
            <Button onPress={() => setShowCreateModal(true)} title="Create new quiz" />
            <Button onPress={() => router.push('/quiz/create')} title="Open full create page" variant="secondary" />
            <Button
              iconLeft={<RefreshIcon color="#334155" size={16} strokeWidth={1.8} />}
              onPress={() => void loadDashboard()}
              title="Refresh dashboard"
              variant="ghost"
            />
          </CardContent>
        </Card>

        {dashboardError ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <Text className="text-sm text-red-700">{dashboardError}</Text>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <MetricCard icon={<Rocket01Icon color="#64748b" size={14} />} label="Monthly activity" value={dashboardLoading ? '...' : monthlyUsageLabel} />
          <MetricCard icon={<SchoolReportCardIcon color="#64748b" size={14} />} label="Score trend" value={dashboardLoading ? '...' : avgScoreLabel} />
          <MetricCard
            icon={<Clock01Icon color="#64748b" size={14} />}
            label="In progress"
            value={dashboardLoading ? '...' : `${stats.quizzesInProgress} quiz${stats.quizzesInProgress === 1 ? '' : 'zes'}`}
          />
          <MetricCard icon={<SignalMedium02Icon color="#64748b" size={14} />} label="Growth areas" value={dashboardLoading ? '...' : `${stats.growthAreasFlagged}`} />
        </View>

        <Card className="p-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">Recent quiz history</CardTitle>
            <Text className="text-sm text-slate-500">Open any row to continue or review.</Text>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <View className="flex-row items-center">
                <Text className="w-[35%] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Topic</Text>
                <Text className="w-[23%] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Status</Text>
                <Text className="w-[22%] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Difficulty</Text>
                <Text className="w-[20%] text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Open</Text>
              </View>
            </View>

            {history.length === 0 ? (
              <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Text className="text-sm text-slate-500">No quizzes yet. Tap Create new quiz to start your first one.</Text>
              </View>
            ) : (
              history.map((item) => (
                <Pressable
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 active:bg-slate-50"
                  key={item.quizId}
                  onPress={() => router.push({ pathname: '/quiz/[quizId]', params: { quizId: item.quizId } })}
                >
                  <View className="flex-row items-center">
                    <Text className="w-[35%] text-sm font-semibold text-slate-900" numberOfLines={1}>{item.topic}</Text>
                    <Text className={`w-[23%] text-xs font-semibold ${statusTone(item.status)}`}>{statusLabel(item.status)}</Text>
                    <Text className="w-[22%] text-xs capitalize text-slate-600">{item.difficulty}</Text>
                    <Text className="w-[20%] text-right text-xs font-semibold text-indigo-600">Open</Text>
                  </View>
                </Pressable>
              ))
            )}

            {historyHasMore ? (
              <Button onPress={() => void loadMoreHistory()} title={historyLoadingMore ? 'Loading...' : 'Load more'} variant="secondary" />
            ) : null}
          </CardContent>
        </Card>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setShowCreateModal(false)} transparent visible={showCreateModal}>
        <View className="flex-1 justify-end bg-slate-900/40">
          <View className="max-h-[88%] rounded-t-[28px] bg-white px-4 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-slate-900">Create new quiz</Text>
                <Text className="text-sm text-slate-500">This opens only when you choose it.</Text>
              </View>
              <Button onPress={() => setShowCreateModal(false)} title="Close" variant="ghost" />
            </View>
            <ScrollView contentContainerClassName="pb-6">
              <QuizCreateForm
                onGenerated={() => {
                  setShowCreateModal(false);
                  void loadDashboard();
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <View className="mb-1 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-[11px] text-slate-500">{label}</Text>
      </View>
      <Text className="text-xs font-semibold text-slate-800">{value}</Text>
    </View>
  );
}

function statusTone(status: QuizHistoryItem['status']): string {
  if (status === 'completed') return 'text-green-700';
  if (status === 'in_progress') return 'text-blue-700';
  if (status === 'queued') return 'text-amber-700';
  if (status === 'failed') return 'text-red-700';
  return 'text-slate-600';
}

function statusLabel(status: QuizHistoryItem['status']): string {
  if (status === 'in_progress') return 'In progress';
  if (status === 'not_started') return 'Not started';
  if (status === 'queued') return 'Queued';
  if (status === 'failed') return 'Failed';
  return 'Completed';
}
