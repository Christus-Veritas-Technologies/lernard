import { Tabs } from 'expo-router';
import {
    BookOpen01Icon,
    ChartBarLineIcon,
    Home01Icon,
    Message01Icon,
    Settings02Icon,
} from 'hugeicons-react-native';

export default function AppLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#7B8EC8',
                tabBarInactiveTintColor: '#64748B',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    paddingBottom: 4,
                },
                sceneStyle: {
                    backgroundColor: '#F8FAFC',
                },
                tabBarStyle: {
                    height: 74,
                    paddingTop: 8,
                    paddingBottom: 10,
                    borderTopWidth: 0,
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.08,
                    shadowRadius: 18,
                    elevation: 10,
                },
            }}
        >
            <Tabs.Screen name="(home)" options={{ title: 'Home', tabBarIcon: createTabIcon(Home01Icon) }} />
            <Tabs.Screen name="(learn)" options={{ title: 'Learn', tabBarIcon: createTabIcon(BookOpen01Icon) }} />
            <Tabs.Screen name="(chat)" options={{ title: 'Chat', tabBarIcon: createTabIcon(Message01Icon) }} />
            <Tabs.Screen name="(progress)" options={{ title: 'Progress', tabBarIcon: createTabIcon(ChartBarLineIcon) }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: createTabIcon(Settings02Icon) }} />
            <Tabs.Screen name="(quiz)" options={{ href: null }} />
            <Tabs.Screen name="guardian" options={{ href: null }} />
        </Tabs>
    );
}

function createTabIcon(Icon: typeof Home01Icon) {
    return ({ color }: { color: string }) => <Icon color={color} size={24} strokeWidth={1.8} />;
}
