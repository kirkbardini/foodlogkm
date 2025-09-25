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

  const realPercentage = max > 0 ? (animatedValue / max) * 100 : 0;
  const barPercentage = Math.min(realPercentage, 100); // Barra limitada a 100%
  
  // Função para determinar status baseado no tipo de macro
  const getStatus = (percentage: number, macroType: string) => {
    switch (macroType.toLowerCase()) {
      case 'proteína':
      case 'proteínas':
        if (percentage < 85) return 'very-low';
        if (percentage <= 94) return 'low';
        if (percentage <= 110) return 'target';
        if (percentage <= 120) return 'above';
        return 'excess';
      
      case 'carboidrato':
      case 'carboidratos':
        if (percentage < 70) return 'very-low';
        if (percentage <= 84) return 'low';
        if (percentage <= 100) return 'target';
        if (percentage <= 105) return 'above';
        return 'excess';
      
      case 'gordura':
      case 'gorduras':
        if (percentage < 70) return 'very-low';
        if (percentage <= 84) return 'low';
        if (percentage <= 100) return 'target';
        if (percentage <= 110) return 'above';
        return 'excess';
      
      case 'caloria':
      case 'calorias':
        if (percentage < 90) return 'very-low';
        if (percentage <= 96) return 'low';
        if (percentage <= 103) return 'target';
        if (percentage <= 107) return 'above';
        return 'excess';
      
      case 'água':
      case 'agua':
        if (percentage < 75) return 'very-low';
        if (percentage <= 90) return 'low';
        if (percentage <= 130) return 'target';
        if (percentage <= 150) return 'above';
        return 'excess';
      
      default:
        // Fallback para outros tipos
        if (percentage < 60) return 'very-low';
        if (percentage <= 79) return 'low';
        if (percentage <= 100) return 'target';
        if (percentage <= 110) return 'above';
        return 'excess';
    }
  };
  
  const status = getStatus(realPercentage, label);

  const statusConfig = {
    'very-low': { icon: '🔴', text: 'Muito baixo', color: 'text-red-600', bgColor: 'bg-red-50' },
    'low': { icon: '🟠', text: 'Baixo', color: 'text-orange-500', bgColor: 'bg-orange-50' },
    'target': { icon: '✅', text: 'Meta', color: 'text-green-600', bgColor: 'bg-green-50' },
    'above': { icon: '🟡', text: 'Acima', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    'excess': { icon: '⚠️', text: 'Excesso', color: 'text-red-500', bgColor: 'bg-red-50' }
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
              {realPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-white/40 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
              style={{
                width: isVisible ? `${barPercentage}%` : '0%',
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
