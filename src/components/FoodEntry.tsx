import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FoodItem, Entry, MealType, QtyUnit } from '../types';
import { calculateNutrition } from '../lib/calculations';

interface FoodEntryProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntry?: Entry | null;
  onUpdate?: (entry: Entry) => void;
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

export const FoodEntry: React.FC<FoodEntryProps> = ({
  isOpen,
  onClose,
  editingEntry,
  onUpdate
}) => {
  const { foods, currentUser, selectedDate, addEntry, updateEntry } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<QtyUnit>('g');
  const [mealType, setMealType] = useState<MealType>('outros');
  const [note, setNote] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);

  // Preencher formulário quando editando
  useEffect(() => {
    if (editingEntry) {
      const food = foods.find(f => f.id === editingEntry.foodId);
      setSelectedFood(food || null);
      setSearchQuery(food?.name || ''); // Preencher campo de busca com nome do alimento
      setQty(editingEntry.qty.toString());
      setUnit(editingEntry.unit);
      setMealType(editingEntry.mealType);
      setNote(editingEntry.note || '');
    } else {
      resetForm();
    }
  }, [editingEntry, foods]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedFood(null);
    setQty('');
    setUnit('g');
    setMealType('outros');
    setNote('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const filtered = foods.filter(food =>
        food.name.toLowerCase().includes(query.toLowerCase()) ||
        food.category.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFood || !qty) return;

    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return;

    const nutrition = calculateNutrition(selectedFood, quantity, unit);
    
    const entryData = {
      userId: currentUser,
      dateISO: selectedDate,
      foodId: selectedFood.id,
      qty: quantity,
      unit,
      mealType,
      note: note.trim() || undefined,
      ...nutrition
    };

    if (editingEntry && onUpdate) {
      const updatedEntry = { ...editingEntry, ...entryData };
      await updateEntry(updatedEntry);
      // onUpdate será chamado automaticamente pelo updateEntry
    } else {
      await addEntry(entryData);
    }

    onClose();
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const nutrition = selectedFood && qty && !isNaN(parseFloat(qty)) ? 
    calculateNutrition(selectedFood, parseFloat(qty), unit) : 
    { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Food Search */}
        <div className="relative">
          <Input
            label="Alimento"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Digite o nome do alimento..."
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => handleFoodSelect(food)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium">{food.name}</div>
                  <div className="text-sm text-gray-500">{food.category}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Quantidade"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0.0"
            step="0.1"
            min="0"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as QtyUnit)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="g">Gramas (g)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="Kg">Quilogramas (Kg)</option>
              <option value="L">Litros (L)</option>
            </select>
          </div>
        </div>

        {/* Meal Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Refeição
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(mealTypeLabels) as MealType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  mealType === type
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">{mealTypeIcons[type]}</div>
                <div>{mealTypeLabels[type]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <Input
          label="Observação (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: sem sal, grelhado..."
        />

        {/* Nutrition Preview */}
        {selectedFood && qty && !isNaN(parseFloat(qty)) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Valores Nutricionais</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Proteínas</div>
                <div className="font-medium">{nutrition.protein_g.toFixed(1)}g</div>
              </div>
              <div>
                <div className="text-gray-600">Carboidratos</div>
                <div className="font-medium">{nutrition.carbs_g.toFixed(1)}g</div>
              </div>
              <div>
                <div className="text-gray-600">Gorduras</div>
                <div className="font-medium">{nutrition.fat_g.toFixed(1)}g</div>
              </div>
              <div>
                <div className="text-gray-600">Calorias</div>
                <div className="font-medium">{nutrition.kcal.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Warning when food not found */}
        {searchQuery && !selectedFood && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-yellow-400 mr-3">⚠️</div>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Alimento não encontrado</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  O alimento "{searchQuery}" não foi encontrado na base de dados. 
                  Verifique a ortografia ou adicione um novo alimento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!selectedFood || !qty}>
            {editingEntry ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
