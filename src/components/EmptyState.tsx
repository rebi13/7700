import { StyleSheet, Text, View } from 'react-native'

interface Props {
  message: string
  sub?: string
}

export function EmptyState({ message, sub }: Props) {
  return (
    <View style={s.container}>
      <Text style={s.message}>{message}</Text>
      {sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32 },
  message: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  sub: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
})
