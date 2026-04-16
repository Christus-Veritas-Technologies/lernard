import { Tabs } from 'expo-router';

export default function AppLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#7B8EC8',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                },
            }}
        >
            <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
            <Tabs.Screen name="(learn)" options={{ title: 'Learn' }} />
            <Tabs.Screen name="(chat)" options={{ title: 'Chat' }} />
            <Tabs.Screen name="(progress)" options={{ title: 'Progress' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
            <Tabs.Screen name="(quiz)" options={{ href: null }} />
            <Tabs.Screen name="guardian" options={{ href: null }} />
        </Tabs>
    );
}
