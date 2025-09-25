import React, { useEffect, useState } from 'react';

interface AnimatedProgressBarProps {
  value: number;
  max: number;
  color: string;
  label: string;
  unit: string;
  showPercentage?: boolean;
  showStatus?: boolean;
  className?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  max,
  color,
  label,
  unit,
  showPercentage = true,
  showStatus = true,
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
    'very-low': { icon: '🔴', text: 'Muito baixo', color: 'text-red-600' },
    'low': { icon: '🟠', text: 'Baixo', color: 'text-orange-500' },
    'target': { icon: '✅', text: 'Meta', color: 'text-green-600' },
    'above': { icon: '🟡', text: 'Acima', color: 'text-yellow-600' },
    'excess': { icon: '⚠️', text: 'Excesso', color: 'text-red-500' }
  };

  const currentStatus = statusConfig[status];

  return (
    <div className={`p-4 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-gray-800 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {animatedValue.toFixed(1)}{unit}
        </div>
        {showPercentage && (
          <div className={`text-sm font-medium ${currentStatus.color}`}>
            {realPercentage.toFixed(0)}% da meta
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
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
      <div className="text-center space-y-2">
        {showStatus && (
          <div className={`text-sm ${currentStatus.color} flex items-center justify-center space-x-1`}>
            <span>{currentStatus.icon}</span>
            <span>{currentStatus.text}</span>
          </div>
        )}
        <div className="text-xs text-gray-500">
          Meta: {max.toFixed(0)}{unit}
        </div>
      </div>
    </div>
  );
};
