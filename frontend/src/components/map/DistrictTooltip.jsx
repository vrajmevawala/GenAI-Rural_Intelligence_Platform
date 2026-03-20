import { getScoreColor } from '@/utils/scoreUtils'
import useLanguage from '@/hooks/useLanguage'
import TranslatedText from '@/components/common/TranslatedText'

export default function DistrictTooltip({ x, y, data }) {
  const { t } = useLanguage()
  const scoreColor = data.avgScore !== null ? getScoreColor(data.avgScore) : null

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl
                 p-3 pointer-events-none min-w-[180px]"
      style={{
        left: x + 12,
        top: y - 10,
        transform: x > window.innerWidth * 0.65 ? 'translateX(-110%)' : 'none',
      }}
    >
      <p className="font-semibold text-gray-900 text-sm mb-2">
        <TranslatedText>{data.name}</TranslatedText> {t('vulnerability.district_label')}
      </p>

      {data.avgScore !== null ? (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{t('vulnerability.avg_vulnerability')}</span>
            <span className={`text-sm font-bold ${scoreColor?.text}`}>
              {Math.round(data.avgScore)}/100
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${data.avgScore}%`, background: scoreColor?.hex }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{data.farmerCount} {t('vulnerability.farmers_count')}</span>
            <span className="text-red-500 font-medium">
              {data.criticalCount} {t('vulnerability.critical')}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">{t('vulnerability.no_data_district')}</p>
      )}
    </div>
  )
}
