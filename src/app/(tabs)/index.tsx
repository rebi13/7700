import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuthStore } from '@/stores/authStore'

export default function HomeScreen() {
  const { user, signOut, isLoading } = useAuthStore()

  return (
    <View style={styles.container}>
      <Text style={styles.label}>로그인된 계정</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={signOut}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  label: { fontSize: 14, color: '#888', marginBottom: 8 },
  email: { fontSize: 18, fontWeight: '600', marginBottom: 32 },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
