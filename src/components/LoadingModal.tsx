import React from 'react';
import { Modal } from './ui/Modal';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({ 
  isOpen, 
  message = 'Sincronizando dados...' 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Não permite fechar durante carregamento
      title="🔄 Sincronizando"
      size="sm"
    >
      <div className="text-center py-8">
        {/* Spinner */}
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        
        {/* Message */}
        <p className="text-gray-600 text-lg font-medium mb-2">
          {message}
        </p>
        
        {/* Subtitle */}
        <p className="text-gray-500 text-sm">
          Carregando dados do Firebase...
        </p>
      </div>
    </Modal>
  );
};
