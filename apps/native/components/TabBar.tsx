import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Role } from '@lernard/shared-types';

import {
    BookOpen01Icon,
    Home01Icon,
    Menu11Icon,
    Message01Icon,
    SchoolBell01Icon,
    Settings02Icon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

import { useAuthStore } from '@/store/store';

const STUDENT_TABS = [
    { name: '(home)', label: 'Home', Icon: Home01Icon },
    { name: 'learn/index', label: 'Learn', Icon: BookOpen01Icon },
    { name: 'quiz/index', label: 'Practice Exams', Icon: SchoolBell01Icon },
    { name: '(chat)/index', label: 'Chat', Icon: Message01Icon },
] as const;

const GUARDIAN_TABS = [
    { name: 'guardian', label: 'Household', Icon: Home01Icon },
    { name: 'settings', label: 'Settings', Icon: Settings02Icon },
] as const;

export function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const role = useAuthStore((currentState) => currentState.role);
    const openStudentDrawer = useAuthStore((currentState) => currentState.openStudentDrawer);
    const tabs = role === Role.GUARDIAN ? GUARDIAN_TABS : STUDENT_TABS;

    return (
        <View
            className="flex-row items-center bg-white px-2"
            style={{
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 10),
                shadowColor: '#0F172A',
                shadowOpacity: 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: -4 },
                elevation: 10,
            }}
        >
            {tabs.map(({ name, label, Icon }) => {
                const route = state.routes.find((r) => r.name === name);
                if (!route) return null;

                const routeIndex = state.routes.indexOf(route);
                const isFocused = state.index === routeIndex;

                function onPress() {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route!.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route!.name, route!.params as object);
                    }
                }

                return (
                    <TouchableOpacity
                        key={name}
                        onPress={onPress}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: isFocused }}
                        activeOpacity={0.7}
                        className="flex-1 items-center justify-center"
                    >
                        <View className="items-center gap-0.5 py-1.5">
                            <Icon size={22} color={isFocused ? '#4F46E5' : '#64748B'} strokeWidth={1.8} />
                            <Text className={isFocused ? 'text-[10px] font-semibold text-indigo-600' : 'text-[10px] font-medium text-slate-500'}>{label}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            {role === Role.STUDENT ? (
                <TouchableOpacity
                    onPress={openStudentDrawer}
                    accessibilityRole="button"
                    accessibilityLabel="Open drawer"
                    activeOpacity={0.7}
                    className="flex-1 items-center justify-center"
                >
                    <View className="items-center gap-0.5 py-1.5">
                        <Menu11Icon size={22} color="#64748B" strokeWidth={1.8} />
                        <Text className="text-[10px] font-medium text-slate-500">More</Text>
                    </View>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
