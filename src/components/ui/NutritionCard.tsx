import React, { useEffect, useState } from 'react';

interface NutritionCardProps {
  value: number;
  max: number;
  color: string;
  label: string;
  unit: string;
  icon: string;
  className?: string;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  value,
  max,
  color,
  label,
  unit,
  icon,
  className = ''
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = max > 0 ? Math.min((animatedValue / max) * 100, 100) : 0;
  const status = percentage >= 100 ? 'excellent' : percentage >= 80 ? 'good' : percentage >= 60 ? 'warning' : 'poor';

  const statusConfig = {
    excellent: { icon: '✅', text: 'Meta atingida!', color: 'text-green-600', bgColor: 'bg-green-50' },
    good: { icon: '👍', text: 'Muito bom!', color: 'text-green-500', bgColor: 'bg-green-50' },
    warning: { icon: '⚠️', text: 'Quase lá!', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    poor: { icon: '📉', text: 'Precisa melhorar', color: 'text-red-500', bgColor: 'bg-red-50' }
  };

  const currentStatus = statusConfig[status];

  return (
    <div className={`relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg ${currentStatus.bgColor} ${className}`}>
      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-lg">{icon}</div>
            <div>
              <div className="text-sm font-medium text-gray-700">{label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {animatedValue.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">{unit}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Progresso</span>
            <span className={`text-xs font-medium ${currentStatus.color}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-white/40 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
              style={{
                width: isVisible ? `${percentage}%` : '0%',
                transition: 'width 1s ease-out'
              }}
            />
          </div>
        </div>

        {/* Status and Meta */}
        <div className="flex items-center justify-between">
          <div className={`text-xs ${currentStatus.color} flex items-center space-x-1`}>
            <span>{currentStatus.icon}</span>
            <span className="hidden sm:inline">{currentStatus.text}</span>
          </div>
          <div className="text-xs text-gray-500">
            Meta: {max.toFixed(0)}{unit}
          </div>
        </div>
      </div>
    </div>
  );
};
