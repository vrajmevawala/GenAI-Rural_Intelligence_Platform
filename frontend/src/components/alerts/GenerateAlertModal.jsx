import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { ALERT_TYPES } from '@/utils/constants'
import { useGenerateAlert, useGenerateBulkAlerts } from '@/hooks/useAlerts'

export default function GenerateAlertModal({ open, onClose, farmerId = null }) {
  const [alertType, setAlertType] = useState('')
  const generateAlert = useGenerateAlert()
  const generateBulk = useGenerateBulkAlerts()

  const handleGenerate = () => {
    if (farmerId) {
      generateAlert.mutate(farmerId, { onSuccess: onClose })
    } else {
      generateBulk.mutate(undefined, { onSuccess: onClose })
    }
  }

  const loading = generateAlert.isPending || generateBulk.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={farmerId ? 'Generate alert' : 'Generate bulk alerts'}
      description={
        farmerId
          ? 'Create a personalized alert for this farmer'
          : 'Generate alerts for all high-risk farmers'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} loading={loading}>
            {farmerId ? 'Generate' : 'Generate all'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Alert type"
          value={alertType}
          onChange={(e) => setAlertType(e.target.value)}
          placeholder="Auto-detect from data"
          options={ALERT_TYPES.map((t) => ({
            value: t,
            label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          }))}
        />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            {farmerId
              ? 'The alert will be generated in the farmer\'s preferred language and sent via the configured channel.'
              : 'This will generate alerts for all farmers with critical or high vulnerability scores. Alerts will be created in each farmer\'s preferred language.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
