import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    BookOpen01Icon,
    ChartBarLineIcon,
    Home01Icon,
    Message01Icon,
    Settings02Icon,
} from 'hugeicons-react-native';

import { Text } from '@rnr/text';

const TABS = [
    { name: '(home)', label: 'Home', Icon: Home01Icon },
    { name: '(learn)', label: 'Learn', Icon: BookOpen01Icon },
    { name: '(chat)', label: 'Chat', Icon: Message01Icon },
    { name: '(progress)', label: 'Progress', Icon: ChartBarLineIcon },
    { name: 'settings', label: 'Settings', Icon: Settings02Icon },
] as const;

export function TabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

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
            {TABS.map(({ name, label, Icon }) => {
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
                        {isFocused ? (
                            // Active: horizontal pill with icon + label
                            <View className="flex-row items-center gap-1.5 rounded-2xl bg-primary-500 px-4 py-2">
                                <Icon size={18} color="#FFFFFF" strokeWidth={2} />
                                <Text className="text-xs font-bold text-white">{label}</Text>
                            </View>
                        ) : (
                            // Inactive: icon stacked above label
                            <View className="items-center gap-0.5 py-1.5">
                                <Icon size={22} color="#64748B" strokeWidth={1.8} />
                                <Text className="text-[10px] font-medium text-slate-500">{label}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
