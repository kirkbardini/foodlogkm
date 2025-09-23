import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { FoodItem } from '../types';
import { ImportFoodsModal } from './ImportFoodsModal';

interface FoodsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FoodsManager: React.FC<FoodsManagerProps> = ({
  isOpen,
  onClose
}) => {
  const { foods, addFood, updateFood, deleteFood } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    per: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
    kcal: string;
    density_g_per_ml: string;
  }>({
    name: '',
    category: '',
    per: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    kcal: '',
    density_g_per_ml: ''
  });

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    food.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFood = () => {
    setFormData({
      name: '',
      category: '',
      per: '',
      protein_g: '',
      carbs_g: '',
      fat_g: '',
      kcal: '',
      density_g_per_ml: ''
    });
    setSelectedFood(null);
    setShowAddModal(true);
  };

  const handleEditFood = (food: FoodItem) => {
    setFormData({
      name: food.name,
      category: food.category,
      per: food.per.toString(),
      protein_g: food.protein_g.toString(),
      carbs_g: food.carbs_g.toString(),
      fat_g: food.fat_g.toString(),
      kcal: food.kcal.toString(),
      density_g_per_ml: (food.density_g_per_ml || 0).toString()
    });
    setSelectedFood(food);
    setShowEditModal(true);
  };

  const handleDeleteFood = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este alimento?')) {
      await deleteFood(id);
    }
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter strings para números
    const foodData = {
      ...formData,
      per: parseFloat(formData.per) || 100,
      protein_g: parseFloat(formData.protein_g) || 0,
      carbs_g: parseFloat(formData.carbs_g) || 0,
      fat_g: parseFloat(formData.fat_g) || 0,
      kcal: parseFloat(formData.kcal) || 0,
      density_g_per_ml: parseFloat(formData.density_g_per_ml) || 0
    };

    if (selectedFood) {
      await updateFood({ ...selectedFood, ...foodData });
    } else {
      await addFood(foodData);
    }
    
    handleCloseModals();
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowImportModal(false);
    setSelectedFood(null);
  };

  const handleImportFoods = () => {
    setShowImportModal(true);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Alimentos"
      size="xl"
    >
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar alimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button onClick={handleAddFood} className="whitespace-nowrap">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Adicionar Alimento
            </Button>
            {/* Botão de importação visível apenas no desktop */}
            <Button 
              onClick={handleImportFoods} 
              variant="secondary" 
              className="whitespace-nowrap hidden md:flex"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Importar JSON
            </Button>
          </div>
        </div>

        {/* Foods List */}
        <div className="space-y-4">
          {filteredFoods.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🍎</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum alimento encontrado
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Tente uma busca diferente.' : 'Adicione alimentos para começar.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredFoods.map((food) => (
                <Card key={food.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{food.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{food.category}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Proteína:</span>
                          <span className="ml-1 font-medium">{food.protein_g}g</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Carboidrato:</span>
                          <span className="ml-1 font-medium">{food.carbs_g}g</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gordura:</span>
                          <span className="ml-1 font-medium">{food.fat_g}g</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Calorias:</span>
                          <span className="ml-1 font-medium">{food.kcal}</span>
                        </div>
                      </div>
                      {food.density_g_per_ml && (
                        <p className="text-xs text-gray-500 mt-1">
                          Densidade: {food.density_g_per_ml}g/ml
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        onClick={() => handleEditFood(food)}
                        variant="secondary"
                        size="sm"
                      >
                        ✏️
                      </Button>
                      <Button
                        onClick={() => handleDeleteFood(food.id)}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Food Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={handleCloseModals}
        title={selectedFood ? 'Editar Alimento' : 'Adicionar Alimento'}
        size="lg"
      >
        <form onSubmit={handleSaveFood} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          <Input
            label="Por (gramas/ml)"
            type="text"
            value={formData.per}
            onChange={(e) => setFormData({ ...formData, per: e.target.value })}
            placeholder="100"
            required
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="Proteína (g)"
              type="text"
              value={formData.protein_g}
              onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
              placeholder="0"
              required
            />
            <Input
              label="Carboidrato (g)"
              type="text"
              value={formData.carbs_g}
              onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
              placeholder="0"
              required
            />
            <Input
              label="Gordura (g)"
              type="text"
              value={formData.fat_g}
              onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
              placeholder="0"
              required
            />
            <Input
              label="Calorias"
              type="text"
              value={formData.kcal}
              onChange={(e) => setFormData({ ...formData, kcal: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          <Input
            label="Densidade (g/ml) - opcional"
            type="text"
            value={formData.density_g_per_ml}
            onChange={(e) => setFormData({ ...formData, density_g_per_ml: e.target.value })}
            placeholder="0"
          />

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={handleCloseModals}>
              Cancelar
            </Button>
            <Button type="submit">
              {selectedFood ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Foods Modal */}
      <ImportFoodsModal
        isOpen={showImportModal}
        onClose={handleCloseModals}
      />
    </Modal>
  );
};
