import type { UseFormReturn } from 'react-hook-form'
import type { ProfileFormData } from '@/schemas/onboarding'
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  TDEE_MODE_OPTIONS,
} from '@/features/onboarding/options'
import { ChipGroup } from '@/components/ChipGroup'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

/** 온보딩 프로필 화면과 설정의 프로필 수정 시트가 공유하는 입력 필드 묶음 */
export function ProfileFields({ form }: { form: UseFormReturn<ProfileFormData> }) {
  const tdeeMode = form.watch('tdeeMode')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="heightCm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>키 (cm) *</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="예: 170"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentWeightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>현재 체중 (kg) *</FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  placeholder="예: 70"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="birthDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>생년월일 *</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>성별 *</FormLabel>
            <FormControl>
              <ChipGroup
                aria-label="성별"
                options={GENDER_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tdeeMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>유지 칼로리 (TDEE) *</FormLabel>
            <FormControl>
              <ChipGroup
                aria-label="유지 칼로리 방식"
                options={TDEE_MODE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {tdeeMode === 'manual' ? (
        <FormField
          control={form.control}
          name="customTdee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>유지 칼로리 (kcal) *</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="예: 2200"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                인바디 등에서 측정한 하루 유지 칼로리를 입력하세요.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>활동 수준 *</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  className="gap-2"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <Label
                      key={opt.value}
                      htmlFor={`activity-${opt.value}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                    >
                      <RadioGroupItem
                        id={`activity-${opt.value}`}
                        value={opt.value}
                        className="mt-0.5"
                      />
                      <span className="grid gap-0.5">
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {opt.desc}
                        </span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
