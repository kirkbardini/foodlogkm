import React, { useEffect, useState } from 'react';

interface CompactNutritionCardProps {
  value: number;
  max: number;
  minimum?: number;
  color: string;
  label: string;
  unit: string;
  icon: string;
  className?: string;
}

export const CompactNutritionCard: React.FC<CompactNutritionCardProps> = ({
  value,
  max,
  minimum,
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
  
  // Função para determinar status baseado na lógica dos relatórios
  const getStatus = (value: number, minimum: number | undefined, max: number, macroType: string) => {
    // Se não há mínimo definido, usar lógica de fallback baseada em percentual
    if (!minimum) {
      const percentage = max > 0 ? (value / max) * 100 : 0;
      if (percentage < 60) return 'very-low';
      if (percentage <= 79) return 'low';
      if (percentage <= 100) return 'target';
      if (percentage <= 110) return 'above';
      return 'excess';
    }

    // Lógica baseada nos relatórios: valor absoluto vs mínimo e meta
    if (value < minimum) return 'very-low'; // 🔴 Abaixo do mínimo
    
    switch (macroType.toLowerCase()) {
      case 'proteína':
      case 'proteínas':
        if (value <= max * 1.05) return 'target'; // 🟢 Meta (até 105%)
        if (value <= max * 1.10) return 'above';   // 🟡 Acima (105% - 110%)
        return 'excess'; // 🔴 Excesso (acima de 110%)
        
      case 'carboidrato':
      case 'carboidratos':
        if (value <= max * 1.05) return 'target'; // 🟢 Meta (até 105%)
        if (value <= max * 1.10) return 'above';   // 🟡 Acima (105% - 110%)
        return 'excess'; // 🔴 Excesso (acima de 110%)
        
      case 'gordura':
      case 'gorduras':
        if (value <= max * 1.15) return 'target'; // 🟢 Meta (até 115%)
        if (value <= max * 1.25) return 'above';   // 🟡 Acima (115% - 125%)
        return 'excess'; // 🔴 Excesso (acima de 125%)
        
      case 'caloria':
      case 'calorias':
        if (value <= max * 1.05) return 'target'; // 🟢 Meta (até 105%)
        if (value <= max * 1.10) return 'above';   // 🟡 Acima (105% - 110%)
        return 'excess'; // 🔴 Excesso (acima de 110%)
        
      case 'água':
      case 'agua':
        if (value <= max * 1.30) return 'target'; // 🟢 Meta (até 130%)
        if (value <= max * 1.50) return 'above';   // 🟡 Acima (130% - 150%)
        return 'excess'; // 🔴 Excesso (acima de 150%)
        
      default:
        if (value <= max * 1.05) return 'target';
        if (value <= max * 1.10) return 'above';
        return 'excess';
    }
  };
  
  const status = getStatus(animatedValue, minimum, max, label);

  const statusConfig = {
    'very-low': { 
      icon: '🔴', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      text: 'Abaixo',
      barColor: 'bg-red-500'
    },
    'low': { 
      icon: '🟠', 
      color: 'text-orange-500', 
      bgColor: 'bg-orange-50', 
      text: 'Baixo',
      barColor: 'bg-orange-500'
    },
    'target': { 
      icon: '🟢', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      text: 'Meta',
      barColor: 'bg-green-500'
    },
    'above': { 
      icon: '🟡', 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50', 
      text: 'Acima',
      barColor: 'bg-yellow-500'
    },
    'excess': { 
      icon: '🔴', 
      color: 'text-red-500', 
      bgColor: 'bg-red-50', 
      text: 'Excesso',
      barColor: 'bg-red-500'
    }
  };

  const currentStatus = statusConfig[status];

  return (
    <div className={`relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-md ${currentStatus.bgColor} ${className}`}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="text-sm">{icon}</div>
            <div className="text-xs font-medium text-gray-700 truncate">{label}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">
              {animatedValue.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">{unit}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Progresso</span>
            <span className={`text-xs font-medium ${currentStatus.color}`}>
              {realPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${currentStatus.barColor}`}
              style={{
                width: isVisible ? `${barPercentage}%` : '0%',
                transition: 'width 1s ease-out'
              }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <div className={`text-xs ${currentStatus.color} flex items-center space-x-1`}>
            <span>{currentStatus.icon}</span>
            <span className="hidden lg:inline text-xs">
              {currentStatus.text}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {max.toFixed(0)}{unit}
          </div>
        </div>
      </div>
    </div>
  );
};
