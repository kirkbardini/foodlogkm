import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddCalorieExpenditureModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export const AddCalorieExpenditureModal: React.FC<AddCalorieExpenditureModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onDateChange
}) => {
  const { currentUser, addCalorieExpenditure, getCalorieExpenditureForDate } = useAppStore();
  const [calories, setCalories] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState<'garmin' | 'manual'>('garmin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = selectedDate || new Date().toISOString().split('T')[0];
  const existingExpenditure = getCalorieExpenditureForDate(currentUser, date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const caloriesNumber = parseFloat(calories);
      
      if (isNaN(caloriesNumber) || caloriesNumber <= 0) {
        setError('Por favor, insira um valor válido de calorias');
        return;
      }

      // Verificar se já existe um registro para este dia
      if (existingExpenditure.length > 0) {
        setError('Já existe um registro de consumo calórico para este dia. Edite o registro existente ou escolha outra data.');
        return;
      }

      await addCalorieExpenditure({
        userId: currentUser,
        dateISO: date,
        calories_burned: caloriesNumber,
        source: source,
        note: note.trim() || undefined
      });

      // Reset form
      setCalories('');
      setNote('');
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar calorie expenditure:', error);
      setError('Erro ao salvar consumo calórico. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCalories('');
    setNote('');
    setSource('garmin');
    setError(null);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Consumo Calórico">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Data *
          </label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => {
              if (onDateChange) {
                onDateChange(e.target.value);
              }
            }}
            className="w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-2">
            Calorias Consumidas *
          </label>
          <Input
            id="calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Ex: 2500"
            min="0"
            step="1"
            required
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Insira o valor do seu relógio Garmin ou estimativa manual
          </p>
        </div>

        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
            Fonte *
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as 'garmin' | 'manual')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          >
            <option value="garmin">Garmin</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
            Observações (opcional)
          </label>
          <Input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Treino intenso, caminhada longa..."
            className="w-full"
          />
        </div>

        {existingExpenditure.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="text-sm text-yellow-800">
                Já existe um registro para este dia: <strong>{existingExpenditure[0].calories_burned} kcal</strong>
                {existingExpenditure[0].note && ` - ${existingExpenditure[0].note}`}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">❌</span>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !calories.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? 'Salvando...' : 'Adicionar Consumo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
