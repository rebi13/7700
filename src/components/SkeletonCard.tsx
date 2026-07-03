import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

interface Props {
  height?: number
  rows?: number
}

export function SkeletonCard({ height, rows = 1 }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start()
  }, [opacity])

  const content = height != null ? (
    <Animated.View style={[s.bar, { height, opacity }]} />
  ) : (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View
          key={i}
          style={[s.bar, { width: i === rows - 1 ? '60%' : '100%', opacity }]}
        />
      ))}
    </>
  )

  return <View style={s.card}>{content}</View>
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  bar: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    height: 16,
  },
})
