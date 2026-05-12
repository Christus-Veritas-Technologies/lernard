import {
  ArrowLeft01Icon,
  BookOpen01Icon,
  Moon02Icon,
  Settings02Icon,
  SparklesIcon,
  SunCloud01Icon,
  SystemUpdate02Icon,
} from 'hugeicons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@lernard/routes';
import {
  getSubjectIcon,
  type LessonContent,
  type LessonSection,
  type LessonSectionType,
} from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { RoleFullScreenLoadingOverlay } from '@/components/RoleFullScreenLoadingOverlay';
import { nativeApiFetch } from '@/lib/native-api';

type LessonResponse = { status: 'generating' | 'ready'; content?: LessonContent };
type ConfidenceChoice = 'got_it' | 'not_sure' | 'confused';
type ThemeMode = 'light' | 'dark' | 'sepia';

const RESPONSE_OPTIONS: Array<{
  key: ConfidenceChoice;
  label: string;
  selectedClassName: string;
  pressedClassName: string;
}> = [
  {
    key: 'got_it',
    label: '✓ Got it',
    selectedClassName: 'border-emerald-500 bg-emerald-50',
    pressedClassName: 'border-emerald-400 bg-emerald-100',
  },
  {
    key: 'not_sure',
    label: '~ Mostly',
    selectedClassName: 'border-amber-500 bg-amber-50',
    pressedClassName: 'border-amber-400 bg-amber-100',
  },
  {
    key: 'confused',
    label: '? Not quite',
    selectedClassName: 'border-rose-500 bg-rose-50',
    pressedClassName: 'border-rose-400 bg-rose-100',
  },
];

const SECTION_STYLES: Record<LessonSectionType, { wrapper: string; label: string }> = {
  hook: {
    wrapper: 'border-amber-200 bg-amber-50',
    label: 'text-amber-700',
  },
  concept: {
    wrapper: 'border-indigo-200 bg-indigo-50',
    label: 'text-indigo-700',
  },
  examples: {
    wrapper: 'border-emerald-200 bg-emerald-50',
    label: 'text-emerald-700',
  },
  recap: {
    wrapper: 'border-violet-200 bg-violet-50',
    label: 'text-violet-700',
  },
};

export default function LessonReaderScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<number, ConfidenceChoice>>({});
  const [savingFor, setSavingFor] = useState<number | null>(null);
  const [reexplainFor, setReexplainFor] = useState<number | null>(null);
  const [sectionOverrides, setSectionOverrides] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [textScale, setTextScale] = useState(100);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nativeApiFetch<LessonResponse>(ROUTES.LESSONS.GET(lessonId));
      if (data.status === 'generating') {
        router.replace('/');
        return;
      }
      startedAtRef.current = Date.now();
      setLesson(data);
    } catch {
      setError('Could not load this lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lessonId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <RoleFullScreenLoadingOverlay forceVisible />;
  }

  if (error || !lesson?.content) {
    return (
      <SafeAreaView className="flex-1 bg-white px-4 pt-6">
        <Text className="mb-4 text-base text-red-600">{error ?? 'Lesson unavailable.'}</Text>
        <Button onPress={load} title="Try again" />
      </SafeAreaView>
    );
  }

  const content = lesson.content;
  const sections = content.sections.map((section, idx) => ({
    ...section,
    body: sectionOverrides[idx] ?? section.body,
  }));
  const elapsedMinutes = Math.floor((Date.now() - startedAtRef.current) / 60000);
  const isOverEstimated = elapsedMinutes > content.estimatedMinutes;
  const remainingMinutes = Math.max(content.estimatedMinutes - elapsedMinutes, 0);
  const subjectKey = getSubjectIcon(content.subjectName);
  const isFullyRead = currentSection >= sections.length - 1;

  const onBack = () => {
    if (!isFullyRead) {
      Alert.alert(
        'Leave this lesson?',
        "Your progress won't be saved.",
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.push('/learn') },
        ],
      );
      return;
    }
    router.push('/learn');
  };

  const onSectionResponse = async (sectionIndex: number, response: ConfidenceChoice) => {
    setResponses((prev) => ({ ...prev, [sectionIndex]: response }));
    setSavingFor(sectionIndex);
    try {
      await nativeApiFetch(ROUTES.LESSONS.SECTION_CHECK(lessonId), {
        method: 'POST',
        body: JSON.stringify({ response }),
      });
    } finally {
      setSavingFor(null);
    }
  };

  const onReexplain = async (sectionIndex: number) => {
    setReexplainFor(sectionIndex);
    try {
      const data = await nativeApiFetch<{ sectionIndex: number; section: LessonSection }>(
        `${ROUTES.LESSONS.REEXPLAIN(lessonId)}?sectionIndex=${sectionIndex}`,
        { method: 'POST' },
      );
      setSectionOverrides((prev) => ({
        ...prev,
        [data.sectionIndex]: `### Another way to look at it\n\n${data.section.body}`,
      }));
    } finally {
      setReexplainFor(null);
    }
  };

  const fontClassName = textScale <= 94 ? 'text-[14px]' : textScale <= 104 ? 'text-[15px]' : 'text-[16px]';

  return (
    <SafeAreaView className={`flex-1 ${themeClassName(theme)}`}>
      <View className="border-b border-slate-200 bg-white/95 px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white" onPress={onBack}>
            <ArrowLeft01Icon color="#334155" size={16} strokeWidth={1.8} />
          </TouchableOpacity>

          <View className="rounded-full bg-indigo-100 px-3 py-1">
            <Text className="text-xs font-semibold text-indigo-700">{content.subjectName}</Text>
          </View>

          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white" onPress={() => setShowSettings(true)}>
            <Settings02Icon color="#334155" size={16} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row gap-2">
          {sections.map((section, idx) => {
            const isDone = idx < currentSection;
            const isActive = idx === currentSection;
            return (
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" key={`${section.type}-${idx}`}>
                <View
                  className={`h-full ${progressClass(section.type)} ${isDone ? 'w-full' : isActive ? 'w-3/5' : 'w-0'}`}
                />
              </View>
            );
          })}
        </View>

        <Text className="mt-1 text-right text-xs text-slate-500">
          {Math.min(currentSection + 1, sections.length)} of {sections.length}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 128, paddingTop: 16 }}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const approximate = Math.floor(y / 420);
          if (approximate !== currentSection && approximate >= 0 && approximate < sections.length) {
            setCurrentSection(approximate);
          }
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-xs uppercase tracking-[0.14em] text-slate-500">Lesson</Text>
          <Text className="mt-1 text-2xl font-semibold text-slate-900">{content.topic}</Text>
          <Text className="mt-2 text-sm text-slate-600">
            {isOverEstimated ? "You're almost done" : `~${content.estimatedMinutes} min read`} · {subjectSummary(subjectKey)}
          </Text>
        </View>

        {sections.map((section, index) => (
          <View
            className={`mb-4 rounded-3xl border-t-4 border p-4 ${SECTION_STYLES[section.type].wrapper}`}
            key={`${section.type}-${index}`}
          >
            <View className="mb-2 flex-row items-center gap-2">
              <SectionIcon section={section.type} subjectKey={subjectKey} />
              
              <Text className={`text-xs font-semibold uppercase tracking-[0.15em] ${SECTION_STYLES[section.type].label}`}>
                {sectionLabel(section.type, index)}
              </Text>
            </View>

            <Text className={`${section.type === 'hook' ? 'text-2xl font-semibold' : 'text-xl font-semibold'} text-slate-900`}>
              {section.heading ?? sectionLabel(section.type, index)}
            </Text>

            <Markdown
              style={markdownStyles(fontClassName)}
              onLinkPress={(url) => {
                if (!url.startsWith('term://')) return false;
                const token = url.replace('term://', '');
                const found = section.terms.find((term) => encodeURIComponent(term.term.toLowerCase()) === token);
                if (found) {
                  Alert.alert(found.term, found.explanation);
                }
                return true;
              }}
            >
              {decorateBodyMarkdown(section.body, section.terms)}
            </Markdown>

            {section.type !== 'recap' && (
              <View className="mt-4 border-t border-slate-200 pt-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Before you move on...</Text>
                <Text className="mt-1 text-sm text-slate-800">Did this make sense?</Text>

                <View className="mt-2 gap-2">
                  {RESPONSE_OPTIONS.map((option) => {
                    const selected = responses[index] === option.key;
                    const pressed = pressedButton === `${index}-${option.key}`;
                    return (
                      <Pressable
                        className={`rounded-xl border px-3 py-2 ${pressed ? option.pressedClassName : selected ? option.selectedClassName : 'border-slate-300 bg-white'}`}
                        disabled={savingFor === index}
                        key={option.key}
                        onPressIn={() => setPressedButton(`${index}-${option.key}`)}
                        onPressOut={() => setPressedButton(null)}
                        onPress={() => {
                          void onSectionResponse(index, option.key);
                        }}
                      >
                        <Text className={`text-sm font-medium ${pressed || selected ? 'text-slate-700' : 'text-slate-700'}`}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {responses[index] === 'confused' ? (
                  <View className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <Text className="text-sm text-amber-900">
                      That&apos;s fine — this is tricky. Want Lernard to explain it differently?
                    </Text>
                    <View className="mt-2 flex-row gap-2">
                      <Pressable
                        className="rounded-lg border border-amber-500 px-3 py-2"
                        disabled={reexplainFor === index}
                        onPress={() => {
                          void onReexplain(index);
                        }}
                      >
                        <Text className="text-sm font-semibold text-amber-800">
                          {reexplainFor === index ? 'Rewriting...' : 'Try a different explanation'}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        onPress={() => setResponses((prev) => ({ ...prev, [index]: 'not_sure' }))}
                      >
                        <Text className="text-sm font-semibold text-slate-700">I&apos;ll keep going</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View className="border-t border-slate-200 bg-white px-4 py-3">
        <Button
          onPress={() =>
            router.push({
              pathname: '/learn/complete',
              params: { lessonId, topic: content.topic },
            })
          }
          title={isFullyRead ? 'Complete lesson' : "I'm done"}
        />
        <Text className="mt-2 text-center text-xs text-slate-500">
          Estimated time remaining: ~{remainingMinutes} min
        </Text>
      </View>

      <Modal animationType="slide" onRequestClose={() => setShowSettings(false)} transparent visible={showSettings}>
        <Pressable className="flex-1 bg-black/35" onPress={() => setShowSettings(false)}>
          <View className="mt-auto rounded-t-3xl bg-white p-5">
            <Text className="text-lg font-semibold text-slate-900">Reader settings</Text>
            <Text className="mt-1 text-sm text-slate-500">Adjust readability while you study.</Text>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-slate-700">Text size</Text>
              <View className="mt-2 flex-row gap-2">
                {[92, 100, 108, 116].map((value) => (
                  <Pressable
                    className={`rounded-lg border px-3 py-2 ${textScale === value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}`}
                    key={value}
                    onPress={() => setTextScale(value)}
                  >
                    <Text className="text-sm text-slate-700">{value}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-slate-700">Theme</Text>
              <View className="mt-2 flex-row gap-2">
                <ThemeButton active={theme === 'light'} icon={<SunCloud01Icon color="#334155" size={14} />} label="Light" onPress={() => setTheme('light')} />
                <ThemeButton active={theme === 'dark'} icon={<Moon02Icon color="#334155" size={14} />} label="Dark" onPress={() => setTheme('dark')} />
                <ThemeButton active={theme === 'sepia'} icon={<SystemUpdate02Icon color="#334155" size={14} />} label="Sepia" onPress={() => setTheme('sepia')} />
              </View>
            </View>

            <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Text className="text-sm text-slate-500">Read aloud (coming soon)</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ThemeButton({ active, icon, label, onPress }: { active: boolean; icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      className={`flex-row items-center gap-1 rounded-lg border px-3 py-2 ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}`}
      onPress={onPress}
    >
      {icon}
      <Text className="text-sm text-slate-700">{label}</Text>
    </Pressable>
  );
}

function SectionIcon({ section, subjectKey }: { section: LessonSectionType; subjectKey: ReturnType<typeof getSubjectIcon> }) {
  if (section === 'hook') {
    return <SparklesIcon color="#B45309" size={14} strokeWidth={1.8} />;
  }
  if (section === 'examples') {
    return <Text className="text-xs font-semibold text-emerald-700">{subjectGlyph(subjectKey)}</Text>;
  }
  if (section === 'recap') {
    return <Text className="text-xs font-semibold text-violet-700">✓</Text>;
  }
  return <BookOpen01Icon color="#4338CA" size={14} strokeWidth={1.8} />;
}

function subjectGlyph(subjectKey: ReturnType<typeof getSubjectIcon>): string {
  if (subjectKey === 'code') return '</>';
  if (subjectKey === 'calculator') return '∑';
  if (subjectKey === 'flask') return '⚗';
  if (subjectKey === 'globe') return '◉';
  if (subjectKey === 'book_text') return 'Aa';
  if (subjectKey === 'trending_up') return '↗';
  if (subjectKey === 'languages') return '文';
  if (subjectKey === 'music') return '♪';
  if (subjectKey === 'palette') return '◍';
  return '✦';
}

function sectionLabel(type: LessonSectionType, index: number): string {
  if (type === 'hook') return 'WHY THIS MATTERS';
  if (type === 'examples') return 'WORKED EXAMPLE';
  if (type === 'recap') return 'QUICK RECAP';
  if (type === 'concept' && index > 1) return 'GOING DEEPER';
  return 'THE CONCEPT';
}

function progressClass(type: LessonSectionType): string {
  if (type === 'hook') return 'bg-amber-500';
  if (type === 'examples') return 'bg-emerald-500';
  if (type === 'recap') return 'bg-violet-600';
  return 'bg-indigo-600';
}

function subjectSummary(subjectIconKey: ReturnType<typeof getSubjectIcon>): string {
  if (subjectIconKey === 'code') return 'Programming';
  if (subjectIconKey === 'calculator') return 'Math';
  if (subjectIconKey === 'flask') return 'Science';
  if (subjectIconKey === 'globe') return 'Social studies';
  if (subjectIconKey === 'book_text') return 'Language';
  if (subjectIconKey === 'trending_up') return 'Business';
  if (subjectIconKey === 'languages') return 'Languages';
  if (subjectIconKey === 'music') return 'Music';
  if (subjectIconKey === 'palette') return 'Art & design';
  return 'General';
}

function themeClassName(theme: ThemeMode): string {
  if (theme === 'dark') return 'bg-slate-900';
  if (theme === 'sepia') return 'bg-amber-50';
  return 'bg-slate-50';
}

function markdownStyles(fontClassName: string) {
  const baseSize = fontClassName === 'text-[14px]' ? 14 : fontClassName === 'text-[15px]' ? 15 : 16;
  return {
    body: {
      color: '#1E293B',
      fontSize: baseSize,
      lineHeight: baseSize * 1.7,
      marginTop: 12,
    },
    heading3: {
      color: '#0F172A',
      marginTop: 16,
      marginBottom: 4,
      fontWeight: '700' as const,
      fontSize: baseSize + 1,
    },
    fence: {
      backgroundColor: '#0F172A',
      color: '#E2E8F0',
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      fontSize: baseSize - 1,
    },
    code_inline: {
      backgroundColor: '#E2E8F0',
      color: '#0F172A',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    link: {
      color: '#0F172A',
      textDecorationLine: 'underline' as const,
      textDecorationStyle: 'dashed' as const,
      textDecorationColor: '#F59E0B',
    },
    bullet_list: {
      marginTop: 8,
    },
    ordered_list: {
      marginTop: 8,
    },
  };
}

function decorateBodyMarkdown(body: string, terms: LessonSection['terms']): string {
  let result = body;

  for (const term of terms) {
    const escaped = term.term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) continue;

    const token = encodeURIComponent(term.term.toLowerCase());
    const matcher = new RegExp(`\\b(${escaped})\\b`, 'i');

    if (matcher.test(result)) {
      result = result.replace(matcher, `[$1](term://${token})`);
    }
  }

  return result;
}
