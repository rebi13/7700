import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'expo-router'
import { signInSchema, type SignInFormData } from '@/schemas/auth'
import { useAuthStore } from '@/stores/authStore'

export default function SignInScreen() {
  const { signIn, isLoading, error } = useAuthStore()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInFormData) => {
    await signIn(data.email, data.password)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>로그인</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="이메일"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {errors.email && (
                <Text style={styles.fieldError}>{errors.email.message}</Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="비밀번호"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {errors.password && (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              )}
            </View>
          )}
        />

        {error && <Text style={styles.serverError}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Text>
        </TouchableOpacity>

        <Link href="/(auth)/sign-up" style={styles.link}>
          계정이 없으신가요? 회원가입
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  fieldWrap: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: '#ef4444' },
  fieldError: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  serverError: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: {
    textAlign: 'center',
    marginTop: 20,
    color: '#3b82f6',
    fontSize: 14,
  },
})
