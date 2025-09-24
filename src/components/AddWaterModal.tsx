import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Entry, QtyUnit } from '../types';

interface AddWaterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWaterModal: React.FC<AddWaterModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, selectedDate, addEntry, foods } = useAppStore();
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [note, setNote] = useState('');

  const waterFood = foods.find(f => f.id === 'agua');

  const handleAddWater = (amount: number) => {
    setTotalQuantity(prev => prev + amount);
  };

  const handleRemoveWater = (amount: number) => {
    setTotalQuantity(prev => Math.max(0, prev - amount));
  };

  const handleReset = () => {
    setTotalQuantity(0);
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalQuantity <= 0) return;

    const entry: Omit<Entry, 'id'> = {
      userId: currentUser,
      dateISO: selectedDate,
      foodId: 'agua',
      qty: totalQuantity,
      unit: 'ml' as QtyUnit,
      mealType: 'outros',
      note: note.trim() || undefined,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      kcal: 0,
      water_ml: totalQuantity
    };

    await addEntry(entry);
    onClose();
    handleReset();
  };

  const handleClose = () => {
    onClose();
    handleReset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="💧 Adicionar Água"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Water Food Info */}
        {waterFood && (
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">💧</span>
              <h3 className="font-medium text-cyan-900">{waterFood.name}</h3>
            </div>
            <p className="text-sm text-cyan-700">
              Adicione água ao seu registro diário
            </p>
          </div>
        )}

        {/* Current Quantity */}
        <div className="text-center">
          <div className="text-4xl font-bold text-cyan-600 mb-2">
            {totalQuantity} ml
          </div>
          <div className="text-sm text-gray-600">Quantidade atual</div>
        </div>

        {/* Quick Add Buttons */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adicionar rapidamente:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => handleAddWater(100)}
                variant="secondary"
                className="text-sm"
              >
                +100ml
              </Button>
              <Button
                type="button"
                onClick={() => handleAddWater(250)}
                variant="secondary"
                className="text-sm"
              >
                +250ml
              </Button>
              <Button
                type="button"
                onClick={() => handleAddWater(500)}
                variant="secondary"
                className="text-sm"
              >
                +500ml
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remover:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => handleRemoveWater(100)}
                variant="secondary"
                className="text-sm"
              >
                -100ml
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                variant="secondary"
                className="text-sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Manual Input */}
        <div>
          <Input
            label="Quantidade personalizada (ml)"
            type="number"
            value={totalQuantity || ''}
            onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
            placeholder="0"
            min="0"
            step="50"
          />
        </div>

        {/* Note */}
        <Input
          label="Observação (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: água com limão, água gelada..."
        />


        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={totalQuantity <= 0}>
            Adicionar Água
          </Button>
        </div>
      </form>
    </Modal>
  );
};
