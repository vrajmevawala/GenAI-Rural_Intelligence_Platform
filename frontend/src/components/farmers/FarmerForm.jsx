import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { GUJARAT_DISTRICTS, CROP_TYPES, SOIL_TYPES, IRRIGATION_TYPES, LOAN_TYPES, LANGUAGES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const step1Schema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  aadhaar_last4: z.string().length(4, 'Enter last 4 digits').optional().or(z.literal('')),
  preferred_language: z.string().min(1, 'Select language'),
  district: z.string().min(1, 'Select district'),
  taluka: z.string().min(1, 'Taluka is required'),
  village: z.string().min(1, 'Village is required'),
})

const step2Schema = z.object({
  land_area_acres: z.coerce.number().min(0, 'Must be positive').optional(),
  primary_crop: z.string().optional(),
  secondary_crop: z.string().optional(),
  soil_type: z.string().optional(),
  irrigation_type: z.string().optional(),
  annual_income_inr: z.coerce.number().min(0).optional(),
  family_size: z.coerce.number().min(1).optional(),
})

const step3Schema = z.object({
  loan_amount_inr: z.coerce.number().min(0).optional(),
  loan_type: z.string().optional(),
  loan_due_date: z.string().optional(),
  has_crop_insurance: z.boolean().optional(),
  insurance_expiry_date: z.string().optional(),
  pm_kisan_enrolled: z.boolean().optional(),
  bank_account_number: z.string().optional(),
})

const schemas = [step1Schema, step2Schema, step3Schema]
const stepLabels = ['Personal details', 'Farm details', 'Financial details']

export default function FarmerForm({ onSubmit, defaultValues = {}, loading = false }) {
  const [step, setStep] = useState(0)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(schemas[step]),
    defaultValues: {
      name: '', phone: '', aadhaar_last4: '', preferred_language: 'gu',
      district: '', taluka: '', village: '',
      land_area_acres: '', primary_crop: '', secondary_crop: '',
      soil_type: '', irrigation_type: '', annual_income_inr: '', family_size: '',
      loan_amount_inr: '', loan_type: '', loan_due_date: '',
      has_crop_insurance: false, insurance_expiry_date: '',
      pm_kisan_enrolled: false, bank_account_number: '',
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  const handleNext = async () => {
    const valid = await trigger()
    if (valid && step < 2) setStep(step + 1)
    if (valid && step === 2) handleSubmit(onSubmit)()
  }

  const hasInsurance = watch('has_crop_insurance')

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < step
                  ? 'bg-[#0F4C35] text-white'
                  : i === step
                  ? 'bg-[#0F4C35]/10 text-[#0F4C35] border-2 border-[#0F4C35]'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block',
                i <= step ? 'text-gray-700' : 'text-gray-400'
              )}
            >
              {label}
            </span>
            {i < 2 && (
              <div
                className={cn(
                  'flex-1 h-0.5 rounded-full',
                  i < step ? 'bg-[#0F4C35]' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full name" error={errors.name?.message} {...register('name')} />
                <Input label="Phone number" error={errors.phone?.message} {...register('phone')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Aadhaar (last 4)" maxLength={4} error={errors.aadhaar_last4?.message} {...register('aadhaar_last4')} />
                <Select
                  label="Language"
                  error={errors.preferred_language?.message}
                  options={LANGUAGES}
                  {...register('preferred_language')}
                />
              </div>
              <Select
                label="District"
                error={errors.district?.message}
                placeholder="Select district"
                options={GUJARAT_DISTRICTS.map((d) => ({ value: d, label: d }))}
                {...register('district')}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Taluka" error={errors.taluka?.message} {...register('taluka')} />
                <Input label="Village" error={errors.village?.message} {...register('village')} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Land area (acres)" type="number" {...register('land_area_acres')} />
                <Input label="Family size" type="number" {...register('family_size')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Primary crop" placeholder="Select crop" options={CROP_TYPES.map((c) => ({ value: c, label: c }))} {...register('primary_crop')} />
                <Select label="Secondary crop" placeholder="Select crop" options={CROP_TYPES.map((c) => ({ value: c, label: c }))} {...register('secondary_crop')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Soil type" placeholder="Select" options={SOIL_TYPES.map((s) => ({ value: s, label: s }))} {...register('soil_type')} />
                <Select label="Irrigation type" placeholder="Select" options={IRRIGATION_TYPES.map((t) => ({ value: t, label: t }))} {...register('irrigation_type')} />
              </div>
              <Input label="Annual income (INR)" type="number" {...register('annual_income_inr')} />
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Loan amount (INR)" type="number" {...register('loan_amount_inr')} />
                <Select label="Loan type" placeholder="Select" options={LOAN_TYPES.map((l) => ({ value: l, label: l }))} {...register('loan_type')} />
              </div>
              <Input label="Loan due date" type="date" {...register('loan_due_date')} />

              <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" {...register('has_crop_insurance')} className="w-4 h-4 rounded border-gray-300 text-[#0F4C35] focus:ring-[#0F4C35]" />
                  Has crop insurance
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" {...register('pm_kisan_enrolled')} className="w-4 h-4 rounded border-gray-300 text-[#0F4C35] focus:ring-[#0F4C35]" />
                  PM-Kisan enrolled
                </label>
              </div>

              {hasInsurance && (
                <Input label="Insurance expiry date" type="date" {...register('insurance_expiry_date')} />
              )}

              <Input label="Bank account number" {...register('bank_account_number')} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          icon={ChevronLeft}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          loading={loading && step === 2}
          iconRight={step < 2 ? ChevronRight : Check}
        >
          {step < 2 ? 'Continue' : 'Save farmer'}
        </Button>
      </div>
    </div>
  )
}
