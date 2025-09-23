import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Entry, MealType } from '../types';
import { formatNumber } from '../lib/calculations';

interface DailyEntriesProps {
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (id: string) => void;
}

const mealTypeLabels: Record<MealType, string> = {
  'cafe-da-manha': 'Café da Manhã',
  'almoco': 'Almoço',
  'lanche': 'Lanche',
  'jantar': 'Jantar',
  'outros': 'Outros'
};

const mealTypeIcons: Record<MealType, string> = {
  'cafe-da-manha': '☀️',
  'almoco': '🍽️',
  'lanche': '🍪',
  'jantar': '🌙',
  'outros': '🍴'
};

const mealOrder: MealType[] = ['cafe-da-manha', 'almoco', 'lanche', 'jantar', 'outros'];

export const DailyEntries: React.FC<DailyEntriesProps> = ({
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const { currentUser, selectedDate, foods, getEntriesForDate } = useAppStore();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const entries = getEntriesForDate(currentUser, selectedDate);
  
  // Separar entradas de água das outras
  const waterEntries = entries.filter(entry => entry.foodId === 'agua');
  const otherEntries = entries.filter(entry => entry.foodId !== 'agua');

  // Agrupar entradas por tipo de refeição
  const groupedEntries = otherEntries.reduce((groups, entry) => {
    if (!groups[entry.mealType]) {
      groups[entry.mealType] = [];
    }
    groups[entry.mealType].push(entry);
    return groups;
  }, {} as Record<MealType, Entry[]>);

  const getFoodName = (foodId: string) => {
    const food = foods.find(f => f.id === foodId);
    return food ? food.name : 'Alimento não encontrado';
  };

  const getFoodCategory = (foodId: string) => {
    const food = foods.find(f => f.id === foodId);
    return food ? food.category : '';
  };

  const formatQty = (entry: Entry) => {
    if (entry.unit === 'g' || entry.unit === 'ml') {
      return `${formatNumber(entry.qty)}${entry.unit}`;
    } else {
      return `${formatNumber(entry.qty)} ${entry.unit}`;
    }
  };

  // Calcular totais por refeição
  const mealTotals = mealOrder.map(mealType => {
    const mealEntries = groupedEntries[mealType] || [];
    const totals = mealEntries.reduce((sum, entry) => ({
      kcal: sum.kcal + entry.kcal,
      protein_g: sum.protein_g + entry.protein_g,
      carbs_g: sum.carbs_g + entry.carbs_g,
      fat_g: sum.fat_g + entry.fat_g,
      count: sum.count + 1
    }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 });
    
    return { mealType, ...totals };
  });

  // Total de água
  const waterTotal = waterEntries.reduce((sum, entry) => sum + entry.qty, 0);

  if (entries.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum lançamento hoje
          </h3>
          <p className="text-gray-600">
            Adicione alimentos para começar a registrar sua alimentação.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção de Água */}
      {waterEntries.length > 0 && (
        <div className="space-y-3">
          <div className="mb-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💧</span>
                <h3 className="text-lg font-semibold text-gray-900">Água</h3>
                <span className="text-sm text-gray-500">
                  ({waterEntries.length} {waterEntries.length === 1 ? 'lançamento' : 'lançamentos'})
                </span>
              </div>
              <div className="text-center">
                <div className="font-semibold text-cyan-600">
                  {formatNumber(waterTotal)} ml
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {waterEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors border border-cyan-200"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {getFoodName(entry.foodId)}
                    </h4>
                    <div className="text-sm text-cyan-600 font-medium">
                      {formatNumber(entry.qty)} ml
                    </div>
                  </div>
                  
                  {entry.note && (
                    <p className="text-sm text-gray-600 mb-2 italic">"{entry.note}"</p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button
                    onClick={() => onEdit(entry)}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    ✏️
                  </Button>
                  <Button
                    onClick={() => onDuplicate(entry)}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    📋
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm(entry.id)}
                    variant="secondary"
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outras Refeições */}
      {mealOrder.map(mealType => {
        const mealEntries = groupedEntries[mealType] || [];
        const mealTotal = mealTotals.find(m => m.mealType === mealType);
        
        if (mealEntries.length === 0) return null;

        return (
          <div key={mealType} className="space-y-3">
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{mealTypeIcons[mealType]}</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mealTypeLabels[mealType]}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({mealEntries.length} {mealEntries.length === 1 ? 'item' : 'itens'})
                  </span>
                </div>
                {mealTotal && mealTotal.count > 0 && (
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">
                      {formatNumber(mealTotal.kcal)} kcal
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(mealTotal.protein_g)}p • {formatNumber(mealTotal.carbs_g)}c • {formatNumber(mealTotal.fat_g)}g
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              {mealEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {getFoodName(entry.foodId)}
                      </h4>
                      <div className="text-sm text-gray-600">
                        {formatQty(entry)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-1">
                      {getFoodCategory(entry.foodId)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>{formatNumber(entry.protein_g)}g proteína</span>
                      <span>{formatNumber(entry.carbs_g)}g carboidrato</span>
                      <span>{formatNumber(entry.fat_g)}g gordura</span>
                      <span className="font-medium">{formatNumber(entry.kcal)} kcal</span>
                    </div>
                    
                    {entry.note && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{entry.note}"</p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      onClick={() => onEdit(entry)}
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                    >
                      ✏️
                    </Button>
                    <Button
                      onClick={() => onDuplicate(entry)}
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                    >
                      📋
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(entry.id)}
                      variant="secondary"
                      size="sm"
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    onDelete(deleteConfirm);
                    setDeleteConfirm(null);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
