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

  const percentage = max > 0 ? Math.min((animatedValue / max) * 100, 100) : 0;
  const status = percentage >= 100 ? 'excellent' : percentage >= 80 ? 'good' : percentage >= 60 ? 'warning' : 'poor';

  const statusConfig = {
    excellent: { icon: '✅', text: 'Meta atingida!', color: 'text-green-600' },
    good: { icon: '👍', text: 'Muito bom!', color: 'text-green-500' },
    warning: { icon: '⚠️', text: 'Quase lá!', color: 'text-yellow-500' },
    poor: { icon: '📉', text: 'Precisa melhorar', color: 'text-red-500' }
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
          <div className={`text-sm font-medium ${
            percentage >= 100 ? 'text-green-600' : 
            percentage >= 80 ? 'text-green-500' : 
            percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {percentage.toFixed(0)}% da meta
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
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
