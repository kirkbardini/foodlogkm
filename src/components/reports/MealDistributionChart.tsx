import React from 'react';
import { Card } from '../ui/Card';

interface MealDistributionChartProps {
  entries: Array<{
    mealType: string;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    kcal: number;
  }>;
}

export const MealDistributionChart: React.FC<MealDistributionChartProps> = ({ entries }) => {
  // Agrupar entradas por tipo de refeição
  const mealData = entries.reduce((acc, entry) => {
    const mealType = entry.mealType;
    if (!acc[mealType]) {
      acc[mealType] = {
        mealType,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        kcal: 0,
        count: 0
      };
    }
    acc[mealType].protein_g += entry.protein_g;
    acc[mealType].carbs_g += entry.carbs_g;
    acc[mealType].fat_g += entry.fat_g;
    acc[mealType].kcal += entry.kcal;
    acc[mealType].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const mealCards = Object.values(mealData).map(meal => ({
    ...meal,
    mealType: getMealTypeLabel(meal.mealType),
    icon: getMealIcon(meal.mealType),
    color: getMealColor(meal.mealType)
  }));

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🍽️</span>
          Distribuição por Refeição
        </h3>
        
        {mealCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mealCards.map((meal, index) => (
              <div key={index} className={`relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg ${meal.color.bgColor}`}>
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-lg">{meal.icon}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">{meal.mealType}</div>
                        <div className="text-xs text-gray-500">{meal.count} item{meal.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {meal.kcal.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">kcal</div>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-gray-600">Proteína</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">
                        {meal.protein_g.toFixed(1)}g
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600">Carboidratos</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">
                        {meal.carbs_g.toFixed(1)}g
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-xs text-gray-600">Gorduras</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">
                        {meal.fat_g.toFixed(1)}g
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🍽️</div>
            <p>Nenhuma refeição registrada hoje</p>
          </div>
        )}
      </div>
    </Card>
  );
};

function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    'breakfast': 'Café da Manhã',
    'lunch': 'Almoço',
    'dinner': 'Jantar',
    'snack': 'Lanche',
    'other': 'Outros',
    // Mapeamento para valores que podem vir do banco
    'cafe-da-manha': 'Café da Manhã',
    'almoco': 'Almoço',
    'jantar': 'Jantar',
    'lanche': 'Lanche',
    'outros': 'Outros'
  };
  return labels[mealType] || mealType;
}

function getMealIcon(mealType: string): string {
  const icons: Record<string, string> = {
    'breakfast': '🌅',
    'lunch': '🍽️',
    'dinner': '🌙',
    'snack': '🍎',
    'other': '🍴',
    // Mapeamento para valores que podem vir do banco
    'cafe-da-manha': '🌅',
    'almoco': '🍽️',
    'jantar': '🌙',
    'lanche': '🍎',
    'outros': '🍴'
  };
  return icons[mealType] || '🍴';
}

function getMealColor(mealType: string): { bgColor: string; borderColor: string } {
  const colors: Record<string, { bgColor: string; borderColor: string }> = {
    'breakfast': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    'lunch': { bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    'dinner': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    'snack': { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    'other': { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
    // Mapeamento para valores que podem vir do banco
    'cafe-da-manha': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    'almoco': { bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    'jantar': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    'lanche': { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    'outros': { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
  };
  return colors[mealType] || { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
}
