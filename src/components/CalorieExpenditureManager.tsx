import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { CalorieExpenditure } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalorieExpenditureManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalorieExpenditureManager: React.FC<CalorieExpenditureManagerProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    currentUser, 
    calorieExpenditure, 
    addCalorieExpenditure, 
    updateCalorieExpenditure, 
    deleteCalorieExpenditure 
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpenditure, setSelectedExpenditure] = useState<CalorieExpenditure | null>(null);
  const [formData, setFormData] = useState<{
    dateISO: string;
    calories_burned: string;
    source: 'garmin' | 'manual';
    note: string;
  }>({
    dateISO: new Date().toISOString().split('T')[0],
    calories_burned: '',
    source: 'garmin',
    note: ''
  });

  const userExpenditure = calorieExpenditure.filter(ce => ce.userId === currentUser);
  const filteredExpenditure = userExpenditure.filter(expenditure =>
    expenditure.dateISO.includes(searchQuery) ||
    expenditure.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expenditure.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setFormData({
      dateISO: new Date().toISOString().split('T')[0],
      calories_burned: '',
      source: 'garmin',
      note: ''
    });
    setSelectedExpenditure(null);
    setShowAddModal(true);
  };

  const handleEdit = (expenditure: CalorieExpenditure) => {
    setFormData({
      dateISO: expenditure.dateISO,
      calories_burned: expenditure.calories_burned.toString(),
      source: expenditure.source,
      note: expenditure.note || ''
    });
    setSelectedExpenditure(expenditure);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de consumo calórico?')) {
      await deleteCalorieExpenditure(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const calories = parseFloat(formData.calories_burned);
    if (isNaN(calories) || calories <= 0) {
      alert('Por favor, insira um valor válido de calorias');
      return;
    }

    const expenditureData = {
      userId: currentUser,
      dateISO: formData.dateISO,
      calories_burned: calories,
      source: formData.source,
      note: formData.note.trim() || undefined
    };

    try {
      if (selectedExpenditure) {
        // Editando
        await updateCalorieExpenditure({
          ...selectedExpenditure,
          ...expenditureData
        });
      } else {
        // Adicionando
        await addCalorieExpenditure(expenditureData);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedExpenditure(null);
    } catch (error) {
      console.error('Erro ao salvar calorie expenditure:', error);
      alert('Erro ao salvar registro. Tente novamente.');
    }
  };

  const handleClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedExpenditure(null);
    onClose();
  };

  const formatDateBR = (dateISO: string) => {
    // Corrigir problema de timezone - adicionar 'T00:00:00' para evitar conversão UTC
    const date = new Date(dateISO + 'T00:00:00');
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Gerenciar Consumo Calórico">
        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder="Buscar por data, nota ou fonte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 text-white">
              + Adicionar
            </Button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredExpenditure.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'Nenhum registro encontrado' : 'Nenhum registro de consumo calórico'}
              </div>
            ) : (
              filteredExpenditure
                .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
                .map((expenditure) => (
                  <Card key={expenditure.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {Math.round(expenditure.calories_burned)} kcal
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDateBR(expenditure.dateISO)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            expenditure.source === 'garmin' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {expenditure.source === 'garmin' ? 'Garmin' : 'Manual'}
                          </span>
                        </div>
                        {expenditure.note && (
                          <p className="text-sm text-gray-600">{expenditure.note}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleEdit(expenditure)}
                          variant="secondary"
                          size="sm"
                        >
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDelete(expenditure.id)}
                          variant="secondary"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>

          {/* Summary */}
          {userExpenditure.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total de registros:</span>
                  <span className="font-medium ml-1">{userExpenditure.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total de calorias:</span>
                  <span className="font-medium ml-1">
                    {Math.round(userExpenditure.reduce((sum, ce) => sum + ce.calories_burned, 0))} kcal
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={showAddModal || showEditModal} 
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedExpenditure(null);
        }}
        title={selectedExpenditure ? 'Editar Consumo Calórico' : 'Adicionar Consumo Calórico'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dateISO" className="block text-sm font-medium text-gray-700 mb-2">
              Data *
            </label>
            <Input
              id="dateISO"
              type="date"
              value={formData.dateISO}
              onChange={(e) => setFormData({ ...formData, dateISO: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="calories_burned" className="block text-sm font-medium text-gray-700 mb-2">
              Calorias Consumidas *
            </label>
            <Input
              id="calories_burned"
              type="number"
              value={formData.calories_burned}
              onChange={(e) => setFormData({ ...formData, calories_burned: e.target.value })}
              placeholder="Ex: 2500"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
              Fonte *
            </label>
            <select
              id="source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as 'garmin' | 'manual' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="manual">Manual</option>
              <option value="garmin">Garmin</option>
            </select>
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
              Observações (opcional)
            </label>
            <Input
              id="note"
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Ex: Treino intenso, caminhada longa..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedExpenditure(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {selectedExpenditure ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
