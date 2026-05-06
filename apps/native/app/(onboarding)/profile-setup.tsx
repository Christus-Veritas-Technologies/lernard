import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    BookOpen01Icon,
    BulbIcon,
    SchoolIcon,
    Target02Icon,
    TimeScheduleIcon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { useNativeProfileSetup } from '@/hooks/useAuthMutations';
import { AgeGroup, LearningGoal, SessionDepth } from '@lernard/shared-types';

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: AgeGroup.PRIMARY, label: 'Primary school' },
    { value: AgeGroup.SECONDARY, label: 'Secondary school' },
    { value: AgeGroup.UNIVERSITY, label: 'University' },
    { value: AgeGroup.PROFESSIONAL, label: 'Professional' },
];

const LEARNING_GOALS: { value: LearningGoal; label: string; description: string }[] = [
    { value: LearningGoal.EXAM_PREP, label: 'Exam prep', description: 'Get ready for upcoming exams' },
    { value: LearningGoal.KEEP_UP, label: 'Keep up', description: 'Stay on top of coursework' },
    { value: LearningGoal.LEARN_NEW, label: 'Learn something new', description: 'Explore a topic from scratch' },
    { value: LearningGoal.FILL_GAPS, label: 'Fill the gaps', description: 'Strengthen growth areas' },
];

const DEPTHS: { value: SessionDepth; label: string; description: string }[] = [
    { value: SessionDepth.QUICK, label: 'Quick', description: 'Fast, focused summaries' },
    { value: SessionDepth.STANDARD, label: 'Standard', description: 'Balanced depth and speed' },
    { value: SessionDepth.DEEP, label: 'Deep dive', description: 'More explanation and examples' },
];

const COMMON_SUBJECTS = [
    'Maths',
    'English',
    'Science',
    'History',
    'Geography',
    'French',
    'Spanish',
    'Biology',
    'Chemistry',
    'Physics',
    'Computer Science',
    'Art',
    'Music',
    'Economics',
    'Business Studies',
];

export default function ProfileSetupScreen() {
    const router = useRouter();
    const { mutate, isLoading, error } = useNativeProfileSetup();

    const [displayName, setDisplayName] = useState('');
    const [grade, setGrade] = useState('');
    const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.SECONDARY);
    const [learningGoal, setLearningGoal] = useState<LearningGoal>(LearningGoal.KEEP_UP);
    const [depth, setDepth] = useState<SessionDepth>(SessionDepth.STANDARD);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [dailyGoal, setDailyGoal] = useState(3);
    const [formError, setFormError] = useState<string | null>(null);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const filteredSubjects = useMemo(() => {
        const query = subjectSearch.trim().toLowerCase();
        if (!query) return COMMON_SUBJECTS;
        return COMMON_SUBJECTS.filter((subject) => subject.toLowerCase().includes(query));
    }, [subjectSearch]);

    function toggleSubject(subject: string) {
        setSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
        );
    }

    async function handleSubmit() {
        setFormError(null);

        if (subjects.length === 0) {
            setFormError('Please pick at least one subject.');
            return;
        }

        await mutate(
            {
                ...(displayName.trim() ? { name: displayName.trim() } : {}),
                ageGroup,
                grade: grade.trim() || null,
                subjects,
                learningGoal,
                preferredSessionLength: dailyGoal * 10,
                preferredDepth: depth,
                dailyGoal,
                timezone,
            },
            {
                onSuccess: () => {
                    router.replace('/(onboarding)/first-look');
                },
            },
        );
    }

    const displayError = error ?? formError;

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
            <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-6" keyboardShouldPersistTaps="handled">
                <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                        <View className="rounded-full bg-primary-100 px-3 py-1">
                            <Text className="text-xs font-bold text-primary-700">Step 1 of 2</Text>
                        </View>
                        <View className="h-px flex-1 bg-primary-200" />
                        <View className="h-1.5 w-6 rounded-full bg-slate-200" />
                    </View>
                    <Text className="text-3xl font-bold text-slate-900">Tell us about you</Text>
                    <Text className="text-sm leading-6 text-slate-500">
                        Lernard uses this to personalize every lesson and quiz.
                    </Text>
                </View>

                {displayError ? (
                    <View className="rounded-xl bg-red-50 px-4 py-3">
                        <Text className="text-sm text-red-600">{displayError}</Text>
                    </View>
                ) : null}

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <Text className="text-sm font-semibold text-slate-900">Profile details</Text>
                    <TextInput
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                        maxLength={50}
                        onChangeText={setDisplayName}
                        placeholder="Display name (optional)"
                        value={displayName}
                    />
                    <TextInput
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                        maxLength={20}
                        onChangeText={setGrade}
                        placeholder="Grade / level (optional)"
                        value={grade}
                    />
                </View>

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-2.5">
                        <View className="rounded-xl bg-primary-100 p-2">
                            <SchoolIcon size={16} color="#4F62A3" />
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">What stage are you at?</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {AGE_GROUPS.map(({ value, label }) => (
                            <TouchableOpacity
                                key={value}
                                activeOpacity={0.8}
                                className={`rounded-xl border px-4 py-2.5 ${ageGroup === value ? 'border-primary-400 bg-primary-100' : 'border-slate-200 bg-slate-50'}`}
                                onPress={() => setAgeGroup(value)}
                            >
                                <Text className={`text-sm font-medium ${ageGroup === value ? 'text-primary-700' : 'text-slate-600'}`}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-2.5">
                        <View className="rounded-xl bg-primary-100 p-2">
                            <BookOpen01Icon size={16} color="#4F62A3" />
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">Which subjects?</Text>
                    </View>
                    <TextInput
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                        onChangeText={setSubjectSearch}
                        placeholder="Search subjects"
                        value={subjectSearch}
                    />
                    <View className="flex-row flex-wrap gap-2">
                        {filteredSubjects.map((subject) => (
                            <TouchableOpacity
                                key={subject}
                                activeOpacity={0.8}
                                className={`rounded-full border px-3.5 py-1.5 ${subjects.includes(subject) ? 'border-primary-400 bg-primary-100' : 'border-slate-200 bg-slate-50'}`}
                                onPress={() => toggleSubject(subject)}
                            >
                                <Text className={`text-sm ${subjects.includes(subject) ? 'font-medium text-primary-700' : 'text-slate-600'}`}>
                                    {subject}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-xs text-slate-500">{subjects.length} selected (minimum 1)</Text>
                </View>

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-2.5">
                        <View className="rounded-xl bg-primary-100 p-2">
                            <Target02Icon size={16} color="#4F62A3" />
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">What's your main goal?</Text>
                    </View>
                    <View className="gap-2">
                        {LEARNING_GOALS.map(({ value, label, description }) => (
                            <TouchableOpacity
                                key={value}
                                activeOpacity={0.8}
                                className={`flex-row items-center gap-3 rounded-2xl border p-4 ${learningGoal === value ? 'border-primary-400 bg-primary-50' : 'border-slate-100 bg-slate-50'}`}
                                onPress={() => setLearningGoal(value)}
                            >
                                <View className={`h-4 w-4 rounded-full border-2 ${learningGoal === value ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`} />
                                <View className="flex-1 gap-0.5">
                                    <Text className="text-sm font-semibold text-slate-900">{label}</Text>
                                    <Text className="text-xs text-slate-500">{description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-2.5">
                        <View className="rounded-xl bg-primary-100 p-2">
                            <BulbIcon size={16} color="#4F62A3" />
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">How do you like to learn?</Text>
                    </View>
                    <View className="gap-2">
                        {DEPTHS.map(({ value, label, description }) => (
                            <TouchableOpacity
                                key={value}
                                activeOpacity={0.8}
                                className={`rounded-2xl border p-4 ${depth === value ? 'border-primary-400 bg-primary-50' : 'border-slate-100 bg-slate-50'}`}
                                onPress={() => setDepth(value)}
                            >
                                <Text className="text-sm font-semibold text-slate-900">{label}</Text>
                                <Text className="text-xs text-slate-500">{description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View className="gap-3 rounded-[24px] bg-white p-5 shadow-sm">
                    <View className="flex-row items-center gap-2.5">
                        <View className="rounded-xl bg-primary-100 p-2">
                            <TimeScheduleIcon size={16} color="#4F62A3" />
                        </View>
                        <Text className="text-sm font-semibold text-slate-900">Daily target</Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity
                            activeOpacity={0.8}
                            className="h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50"
                            onPress={() => setDailyGoal((current) => Math.max(1, current - 1))}
                        >
                            <Text className="text-lg font-bold text-slate-700">-</Text>
                        </TouchableOpacity>
                        <View className="flex-1 items-center">
                            <Text className="text-3xl font-bold text-primary-600">{dailyGoal}</Text>
                            <Text className="text-xs text-slate-500">lesson{dailyGoal === 1 ? '' : 's'} per day</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            className="h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50"
                            onPress={() => setDailyGoal((current) => Math.min(10, current + 1))}
                        >
                            <Text className="text-lg font-bold text-slate-700">+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    className="h-14 items-center justify-center rounded-[24px] bg-primary"
                    disabled={isLoading || subjects.length === 0}
                    onPress={handleSubmit}
                    style={{ opacity: isLoading || subjects.length === 0 ? 0.6 : 1 }}
                >
                    <Text className="text-base font-bold text-white">
                        {isLoading ? 'Saving...' : 'Continue to First Look'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
