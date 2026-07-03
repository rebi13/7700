import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <View style={s.banner}>
      <Text style={s.text} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={s.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  text: { flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 18 },
  dismiss: { fontSize: 14, color: '#ef4444', fontWeight: '700' },
})
