import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ tabBarLabel: '홈' }} />
      <Tabs.Screen name="add-log" options={{ tabBarLabel: '기록' }} />
    </Tabs>
  )
}
