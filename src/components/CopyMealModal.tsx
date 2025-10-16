import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore';
import { Entry, MealType, UserId } from '../types';

interface CopyMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  originData: {
    date: string;
    mealType: MealType;
    entries: Entry[];
  } | null;
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

const mealTypes: MealType[] = ['cafe-da-manha', 'almoco', 'lanche', 'jantar', 'outros'];

export const CopyMealModal: React.FC<CopyMealModalProps> = ({
  isOpen,
  onClose,
  originData
}) => {
  const { addEntry, foods, currentUser } = useAppStore();
  const [targetDate, setTargetDate] = useState('');
  const [targetMeal, setTargetMeal] = useState<MealType>('almoco');
  const [targetUser, setTargetUser] = useState<UserId>(currentUser);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && originData) {
      // Definir data padrão como amanhã
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTargetDate(tomorrow.toISOString().split('T')[0]);
      // Definir usuário padrão como o usuário atual
      setTargetUser(currentUser);
      // Definir refeição padrão como a mesma da origem
      setTargetMeal(originData.mealType);
    }
  }, [isOpen, currentUser, originData]);

  const formatDateBR = (dateISO: string) => {
    const date = new Date(dateISO + 'T00:00:00');
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const getFoodName = (foodId: string) => {
    const food = foods.find(f => f.id === foodId);
    return food ? food.name : 'Alimento não encontrado';
  };

  const handleCopy = async () => {
    if (!originData || !targetDate || !targetMeal || !targetUser) return;

    setIsLoading(true);
    try {
      // Criar novas entradas com os dados de destino
      const newEntries: Entry[] = originData.entries.map(entry => ({
        ...entry,
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: targetUser,
        dateISO: targetDate,
        mealType: targetMeal,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      // Adicionar todas as entradas
      for (const entry of newEntries) {
        await addEntry(entry);
      }

      // Fechar modal e resetar
      onClose();
      setTargetDate('');
      setTargetMeal(originData.mealType);
      setTargetUser(currentUser);
    } catch (error) {
      console.error('Erro ao copiar refeição:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !originData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            📋 Copiar Refeição
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Dados de origem */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800 font-medium mb-2">
            ✅ Copiando:
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">
              {mealTypeIcons[originData.mealType]}
            </span>
            <div>
              <div className="font-medium text-blue-900">
                {mealTypeLabels[originData.mealType]}
              </div>
              <div className="text-sm text-blue-700">
                de {formatDateBR(originData.date)}
              </div>
              <div className="text-xs text-blue-600">
                {originData.entries.length} item(s)
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de destino */}
        <div className="space-y-4">
          {/* Data de destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Colar em:
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Refeição de destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🍽️ Refeição:
            </label>
            <select
              value={targetMeal}
              onChange={(e) => setTargetMeal(e.target.value as MealType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mealTypes.map(mealType => (
                <option key={mealType} value={mealType}>
                  {mealTypeIcons[mealType]} {mealTypeLabels[mealType]}
                </option>
              ))}
            </select>
          </div>

          {/* Usuário de destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Para qual usuário:
            </label>
            <select
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value as UserId)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kirk">👨‍💻 Kirk</option>
              <option value="manu">👩‍💻 Manu</option>
            </select>
          </div>
        </div>

        {/* Preview dos itens que serão copiados */}
        {originData.entries.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">
              📋 Itens que serão copiados para {targetUser === 'kirk' ? '👨‍💻 Kirk' : '👩‍💻 Manu'}:
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {originData.entries.map((entry, index) => (
                <div key={index} className="text-xs text-gray-600 flex justify-between">
                  <span className="truncate flex-1">
                    {getFoodName(entry.foodId)}
                  </span>
                  <span className="ml-2 text-gray-500">
                    {entry.qty}{entry.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCopy}
            disabled={!targetDate || !targetMeal || !targetUser || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Copiando...' : '✅ Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
};
