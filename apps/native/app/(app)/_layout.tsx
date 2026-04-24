import { Tabs } from 'expo-router';

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
