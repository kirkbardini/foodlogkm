import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export const SyncBar: React.FC = () => {
  const { currentUser, users, cleanDuplicates } = useAppStore();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isAuthenticated] = useState(false);

  const currentUserData = users.find(u => u.id === currentUser);
  const userName = currentUserData?.name || 'Usuário';

  // Verificar autenticação - DESABILITADO temporariamente
  // useEffect(() => {
  //   const unsubscribe = firebaseSyncService.onAuthStateChanged((user) => {
  //     setIsAuthenticated(user !== null);
  //   });
  //   return () => unsubscribe();
  // }, []);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return isAuthenticated ? '☁️' : '📱';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Sincronizando...';
      case 'success': return 'Sincronizado';
      case 'error': return 'Erro';
      default: return isAuthenticated ? 'Conectado' : 'Offline';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return isAuthenticated ? 'text-blue-600' : 'text-gray-500';
    }
  };

  const handleSyncClick = () => {
    setShowSyncModal(true);
  };

  return (
    <>
      {/* Barra de Sincronização Fixa */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Status e Usuário */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getStatusIcon()}</span>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-sm text-gray-600">Olá,</span>
                <span className="text-sm font-semibold text-gray-900">{userName}</span>
              </div>
            </div>

            {/* Botão de Gerenciar */}
            <Button
              onClick={handleSyncClick}
              variant="secondary"
              size="sm"
              className="text-xs px-3 py-1.5"
            >
              <span className="hidden sm:inline">Gerenciar</span>
              <span className="sm:hidden">⚙️</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Sincronização */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="🔄 Sincronização"
        size="md"
      >
        <div className="space-y-4">
          {/* Status Atual */}
          <div className="text-center">
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusIcon()} {getStatusText()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {isAuthenticated ? 'Conectado ao Firebase' : 'Modo offline'}
            </div>
          </div>

          {/* Informações do Usuário */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Usuário Atual</h4>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{userName}</div>
                <div className="text-sm text-gray-500">ID: {currentUser}</div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            {!isAuthenticated ? (
              <Button
                onClick={() => {
                  setIsLoading(true);
                  setSyncStatus('syncing');
                  // firebaseSyncService.signInWithGoogle().then(() => {
                  //   setSyncStatus('success');
                  //   setIsLoading(false);
                  // }).catch(() => {
                  //   setSyncStatus('error');
                  //   setIsLoading(false);
                  // });
                  // Temporariamente desabilitado
                  setTimeout(() => {
                    setSyncStatus('error');
                    setIsLoading(false);
                  }, 1000);
                }}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Conectando...' : '🔐 Conectar ao Firebase'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setIsLoading(true);
                    setSyncStatus('syncing');
                    // Simular sincronização
                    setTimeout(() => {
                      setSyncStatus('success');
                      setIsLoading(false);
                    }, 2000);
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sincronizando...' : '🔄 Sincronizar Agora'}
                </Button>
                <Button
                  onClick={() => {
                    // firebaseSyncService.signOut();
                    setSyncStatus('idle');
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  🚪 Desconectar
                </Button>
                <Button
                  onClick={async () => {
                    setIsLoading(true);
                    setSyncStatus('syncing');
                    try {
                      await cleanDuplicates();
                      setSyncStatus('success');
                    } catch (error) {
                      setSyncStatus('error');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoading ? 'Limpando...' : '🧹 Limpar Duplicatas'}
                </Button>
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Como Funciona</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>📱 <strong>Modo offline</strong> - funciona sem internet</li>
              <li>☁️ <strong>Firebase</strong> - sincroniza dados na nuvem</li>
              <li>🔄 <strong>Automático</strong> - mudanças são salvas instantaneamente</li>
              <li>👥 <strong>Multi-usuário</strong> - Kirk e Manu compartilham dados</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};
