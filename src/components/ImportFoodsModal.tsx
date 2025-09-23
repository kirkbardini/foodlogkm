import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { FoodItem } from '../types';

interface ImportFoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportFoodsModal: React.FC<ImportFoodsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { importFoods } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Por favor, selecione um arquivo JSON válido.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('O arquivo deve conter um array de alimentos.');
      }

      // Validar estrutura dos alimentos
      const validFoods: FoodItem[] = [];
      for (const item of data) {
        if (
          typeof item.name === 'string' &&
          typeof item.category === 'string' &&
          typeof item.per === 'number' &&
          typeof item.protein_g === 'number' &&
          typeof item.carbs_g === 'number' &&
          typeof item.fat_g === 'number' &&
          typeof item.kcal === 'number'
        ) {
          validFoods.push({
            id: item.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name,
            category: item.category,
            per: item.per,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            kcal: item.kcal,
            density_g_per_ml: item.density_g_per_ml || undefined
          });
        }
      }

      if (validFoods.length === 0) {
        throw new Error('Nenhum alimento válido encontrado no arquivo.');
      }

      const result = await importFoods(validFoods);
      setSuccess(`Importação concluída! ${result.added} alimentos adicionados, ${result.updated} atualizados.`);
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: "Arroz Branco",
        category: "Cereais",
        per: 100,
        protein_g: 7.2,
        carbs_g: 28.0,
        fat_g: 0.3,
        kcal: 130
      },
      {
        name: "Frango Grelhado",
        category: "Carnes",
        per: 100,
        protein_g: 23.0,
        carbs_g: 0,
        fat_g: 1.2,
        kcal: 99
      }
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alimentos_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📥 Importar Alimentos"
      size="lg"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Como importar:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Baixe o template de exemplo</li>
            <li>Preencha com seus alimentos (formato JSON)</li>
            <li>Arraste o arquivo para cá ou clique para selecionar</li>
          </ol>
        </div>

        {/* Template Download */}
        <div className="text-center">
          <Button
            onClick={downloadTemplate}
            variant="secondary"
            className="mb-4"
          >
            📄 Baixar Template
          </Button>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-4xl mb-4">📁</div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Arraste o arquivo JSON aqui
          </p>
          <p className="text-gray-600 mb-4">ou</p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Selecionar Arquivo
          </label>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400 mr-3">❌</div>
              <div>
                <h4 className="text-sm font-medium text-red-800">Erro na importação</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-green-400 mr-3">✅</div>
              <div>
                <h4 className="text-sm font-medium text-green-800">Importação bem-sucedida</h4>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Processando arquivo...</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button onClick={handleClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
