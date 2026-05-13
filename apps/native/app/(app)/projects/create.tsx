import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft01Icon, SparklesIcon } from 'hugeicons-react-native';

import { ROUTES } from '@lernard/routes';
import type { ProjectLevel } from '@lernard/shared-types';

import { Text } from '@rnr/text';

import { Button } from '@/components/Button';
import { nativeApiFetch } from '@/lib/native-api';

type CreateStep = 'details' | 'generating';

const LEVEL_OPTIONS: { value: ProjectLevel; label: string }[] = [
    { value: 'grade7', label: 'Grade 7' },
    { value: 'olevel', label: 'Form 4 (O Level)' },
    { value: 'alevel', label: 'Form 6 (A Level)' },
];

function generateUUID(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function ProjectCreateScreen() {
    const router = useRouter();

    const [step, setStep] = useState<CreateStep>('details');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [fullName, setFullName] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [candidateNumber, setCandidateNumber] = useState('');
    const [centreNumber, setCentreNumber] = useState('');
    const [subject, setSubject] = useState('');
    const [level, setLevel] = useState<ProjectLevel>('olevel');

    const detailsValid =
        fullName.trim().length > 0 &&
        schoolName.trim().length > 0 &&
        candidateNumber.trim().length > 0 &&
        centreNumber.trim().length > 0 &&
        subject.trim().length > 0;

    async function handleSubmit() {
        if (!detailsValid) return;
        setFormError(null);
        setSubmitting(true);
        setStep('generating');

        try {
            const draft = await nativeApiFetch<{ draftId: string }>(ROUTES.PROJECTS.CREATE_DRAFT, {
                method: 'POST',
                body: JSON.stringify({
                    subject: subject.trim(),
                    level,
                    studentInfo: {
                        fullName: fullName.trim(),
                        schoolName: schoolName.trim(),
                        candidateNumber: candidateNumber.trim(),
                        centreNumber: centreNumber.trim(),
                    },
                }),
            });

            const result = await nativeApiFetch<{ projectId: string }>(ROUTES.PROJECTS.GENERATE, {
                method: 'POST',
                body: JSON.stringify({
                    draftId: draft.draftId,
                    idempotencyKey: generateUUID(),
                }),
            });

            router.replace(`/(app)/projects/${result.projectId}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not create project. Please try again.';
            setFormError(message);
            setSubmitting(false);
            setStep('details');
        }
    }

    if (step === 'generating') {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-background px-8" edges={['top']}>
                <View className="items-center">
                    <View className="mb-6 h-16 w-16 items-center justify-center rounded-[28px] bg-primary-500">
                        <SparklesIcon color="#ffffff" size={28} strokeWidth={1.8} />
                    </View>
                    <Text className="text-center text-2xl font-semibold text-slate-900">Generating your project</Text>
                    <Text className="mt-3 text-center text-sm leading-6 text-slate-600">
                        Lernard is building your{' '}
                        <Text className="font-semibold text-slate-900">{subject}</Text> document.
                        {'\n'}This takes about 30–60 seconds.
                    </Text>
                    <View className="mt-8 flex-row gap-2">
                        <View className="h-2 w-2 animate-bounce rounded-full bg-primary-400" />
                        <View className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '150ms' }} />
                        <View className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '300ms' }} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16, gap: 14 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center gap-3">
                    <Pressable
                        className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
                        onPress={() => router.back()}
                    >
                        <ArrowLeft01Icon color="#334155" size={18} strokeWidth={1.9} />
                    </Pressable>
                    <Text className="text-2xl font-semibold text-slate-900">New project</Text>
                </View>

                <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <Text className="text-lg font-semibold text-slate-900">Your details</Text>
                    <Text className="mt-1 text-sm text-slate-600">
                        These appear on the generated document. Lernard assigns all marks and writes all sections.
                    </Text>

                    <View className="mt-5 gap-4">
                        <FormField label="Full name *" value={fullName} onChangeText={setFullName} placeholder="Your full name" maxLength={80} />
                        <FormField label="School *" value={schoolName} onChangeText={setSchoolName} placeholder="Your school name" maxLength={120} />
                        <FormField label="Candidate number *" value={candidateNumber} onChangeText={setCandidateNumber} placeholder="e.g. 123456" maxLength={32} />
                        <FormField label="Centre number *" value={centreNumber} onChangeText={setCentreNumber} placeholder="e.g. 04321" maxLength={32} />
                        <FormField label="Subject *" value={subject} onChangeText={setSubject} placeholder="e.g. Biology, Geography, History" maxLength={300} />
                    </View>

                    <View className="mt-5 gap-2">
                        <Text className="text-sm font-semibold text-slate-900">Level *</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {LEVEL_OPTIONS.map((opt) => (
                                <Pressable
                                    key={opt.value}
                                    className={`rounded-full border-2 px-4 py-2 ${
                                        level === opt.value
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                    onPress={() => setLevel(opt.value)}
                                >
                                    <Text
                                        className={`text-sm font-semibold ${
                                            level === opt.value ? 'text-primary-700' : 'text-slate-600'
                                        }`}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                {formError ? (
                    <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <Text className="text-sm text-amber-800">{formError}</Text>
                    </View>
                ) : null}

                <Button
                    title="Generate project"
                    iconLeft={<SparklesIcon color="#ffffff" size={16} strokeWidth={1.9} />}
                    onPress={() => void handleSubmit()}
                    disabled={submitting || !detailsValid}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    maxLength,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    maxLength: number;
}) {
    return (
        <View className="gap-1.5">
            <Text className="text-sm font-semibold text-slate-900">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                maxLength={maxLength}
                placeholderTextColor="#94A3B8"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            />
        </View>
    );
}
