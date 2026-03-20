import React from 'react';
import { Cloud, Thermometer, Droplets, Wind, Calendar } from 'lucide-react';
import Card, { CardTitle } from '@/components/ui/Card';
import { formatDate } from '@/utils/formatters';
import TranslatedText from '@/components/common/TranslatedText';
import useLanguage from '@/hooks/useLanguage';

export default function WeatherCard({ weather, location }) {
  const { t } = useLanguage();
  
  if (!weather) {
    return (
      <Card className="h-full flex flex-col justify-center items-center text-gray-400 py-8">
        <Cloud className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">{t('weather.no_data') || 'No weather data available'}</p>
      </Card>
    );
  }

  const items = [
    { icon: Thermometer, label: t('weather.temp') || 'Temperature', value: `${weather.temperature}°C`, color: 'text-orange-500' },
    { icon: Droplets, label: t('weather.rainfall') || 'Precipitation', value: `${weather.rainfall} mm`, color: 'text-blue-500' },
    { icon: Wind, label: t('weather.humidity') || 'Humidity', value: `${weather.humidity}%`, color: 'text-teal-500' },
  ];

  return (
    <Card className="h-full overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-500" />
            {t('weather.title') || 'Local Weather'}
          </CardTitle>
          <p className="text-[10px] text-gray-400 mt-1">
            <TranslatedText>{location}</TranslatedText> • {formatDate(weather.fetched_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100/50">
            <item.icon className={`w-4 h-4 ${item.color} mb-2`} />
            <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">{item.label}</p>
            <p className="text-sm font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
