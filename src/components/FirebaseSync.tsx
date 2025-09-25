import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { firebaseSyncService } from '../lib/firebaseSync';
import { database } from '../lib/database';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface FirebaseSyncProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const FirebaseSync: React.FC<FirebaseSyncProps> = ({
  isOpen = false,
  onClose = () => {},
  onLoadingChange
}) => {
  const {
    loadInitialData,
    isAuthenticated,
    setAuthenticated
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Verificar autenticação - REABILITADO para usuários
  useEffect(() => {
    const unsubscribe = firebaseSyncService.onAuthStateChanged((user) => {
      const authenticated = user !== null;
      setAuthenticated(authenticated);
      
      if (authenticated) {
        console.log('✅ Usuário autenticado:', user.displayName);
        checkAuthentication();
      } else {
        console.log('❌ Usuário não autenticado');
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuthentication = async () => {
    const user = firebaseSyncService.getCurrentUser();
    if (user) {
      setAuthenticated(true);
      console.log('✅ Usuário autenticado, sincronizando...');
      
      // Mostrar loading durante verificação
      onLoadingChange?.(true);
      
      try {
        // Sincronização real - carregar dados do Firebase
        await loadDataFromFirebase();
      } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        setSyncStatus('error');
      } finally {
        onLoadingChange?.(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      const success = await firebaseSyncService.signInWithGoogle();
      if (success) {
        setAuthenticated(true);
        console.log('✅ Login realizado com sucesso');
        
        // Mostrar loading durante verificação
        onLoadingChange?.(true);
        
        try {
          // Sincronização real - carregar dados do Firebase
          await loadDataFromFirebase();
          console.log('✅ Sincronização concluída com sucesso');
        } catch (error) {
          console.error('❌ Erro na sincronização:', error);
          setSyncStatus('error');
        } finally {
          onLoadingChange?.(false);
        }
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await firebaseSyncService.signOut();
    setAuthenticated(false);
    setSyncStatus('idle');
  };

  const loadDataFromFirebase = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // ESTRATÉGIA UNIDIRECIONAL: Firebase → Local
      console.log('🔄 Carregando dados do Firebase (FIREBASE → LOCAL)...');
      
      // Carregar todos os dados do Firebase (fonte da verdade)
      const { entries: firebaseEntries, foods: firebaseFoods, users: firebaseUsers } = await firebaseSyncService.loadAllUsersData();
      
      console.log(`📊 Dados do Firebase: ${firebaseEntries.length} entradas, ${firebaseFoods.length} alimentos, ${firebaseUsers.length} usuários`);
      
      // Atualizar dados locais com dados do Firebase (unidirecional)
      console.log('🔄 Atualizando dados locais com dados do Firebase...');
      
      // 1. Atualizar usuários (metas) do Firebase
      for (const user of firebaseUsers) {
        await database.updateUser(user);
      }
      console.log(`👥 ${firebaseUsers.length} usuários atualizados do Firebase`);
      
      // 2. Atualizar alimentos do Firebase
      for (const firebaseFood of firebaseFoods) {
        try {
          const existingFood = await database.getFood(firebaseFood.id);
          
          if (existingFood) {
            // Alimento existe - atualizar com dados do Firebase
            await database.updateFood(firebaseFood);
          } else {
            // Alimento não existe - adicionar do Firebase
            await database.addFood(firebaseFood);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao sincronizar alimento ${firebaseFood.name}:`, error);
        }
      }
      console.log(`🍎 ${firebaseFoods.length} alimentos sincronizados do Firebase`);
      
      // 2.1. Detectar e remover alimentos deletados no Firebase
      const localFoods = await database.getAllFoods();
      const firebaseFoodIds = new Set(firebaseFoods.map(f => f.id));
      const foodsToDelete = localFoods.filter(food => !firebaseFoodIds.has(food.id));
      
      if (foodsToDelete.length > 0) {
        console.log(`🗑️ Detectados ${foodsToDelete.length} alimentos deletados no Firebase`);
        for (const food of foodsToDelete) {
          try {
            await database.deleteFood(food.id);
            console.log(`🗑️ Alimento deletado localmente: ${food.name}`);
          } catch (error) {
            console.warn(`⚠️ Erro ao deletar alimento ${food.name}:`, error);
          }
        }
        console.log(`✅ ${foodsToDelete.length} alimentos deletados localmente`);
      }
      
      // 3. Atualizar entradas do Firebase
      for (const firebaseEntry of firebaseEntries) {
        try {
          const existingEntry = await database.getEntry(firebaseEntry.id);
          
          if (existingEntry) {
            // Entrada existe - atualizar com dados do Firebase
            await database.updateEntry(firebaseEntry);
          } else {
            // Entrada não existe - adicionar do Firebase
            await database.addEntry(firebaseEntry);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao sincronizar entrada ${firebaseEntry.id}:`, error);
        }
      }
      console.log(`📝 ${firebaseEntries.length} entradas sincronizadas do Firebase`);
      
      // 3.1. Detectar e remover entradas deletadas no Firebase
      const localEntries = await database.getAllEntries();
      const firebaseEntryIds = new Set(firebaseEntries.map(e => e.id));
      const entriesToDelete = localEntries.filter(entry => !firebaseEntryIds.has(entry.id));
      
      if (entriesToDelete.length > 0) {
        console.log(`🗑️ Detectadas ${entriesToDelete.length} entradas deletadas no Firebase`);
        for (const entry of entriesToDelete) {
          try {
            await database.deleteEntry(entry.id);
            console.log(`🗑️ Entrada deletada localmente: ${entry.id}`);
          } catch (error) {
            console.warn(`⚠️ Erro ao deletar entrada ${entry.id}:`, error);
          }
        }
        console.log(`✅ ${entriesToDelete.length} entradas deletadas localmente`);
      }
      
      // 4. Atualizar estado da aplicação com dados do Firebase
      const updatedFoods = await database.getAllFoods();
      const updatedEntries = await database.getAllEntries();
      const updatedUsers = await database.getAllUsers();
      
      // Atualizar estado da aplicação
      useAppStore.setState({ foods: updatedFoods, entries: updatedEntries, users: updatedUsers });
      
      console.log('✅ Sincronização unidirecional concluída (FIREBASE → LOCAL)');
      setSyncStatus('success');
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do Firebase:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDataToFirebase = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Carregar dados locais
      await loadInitialData();
      
      // Sincronizar com Firebase
      const { foods, entries, users } = useAppStore.getState();
      
      console.log('🔄 Enviando dados para Firebase...');
      await firebaseSyncService.saveFoods(foods);
      await firebaseSyncService.saveEntries(entries);
      await firebaseSyncService.saveUsers(users);
      
      console.log('✅ Dados enviados para Firebase com sucesso');
      setSyncStatus('success');
    } catch (error) {
      console.error('❌ Erro ao enviar dados para Firebase:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return isAuthenticated ? 'text-green-600' : 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Sincronizando...';
      case 'success': return 'Conectado';
      case 'error': return 'Erro na sincronização';
      default: return isAuthenticated ? 'Conectado' : 'Pronto para sincronizar';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Sincronização">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Gerenciar Sincronização</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {!isAuthenticated ? (
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Entrando...' : 'Entrar com Google'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={saveDataToFirebase}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Enviando...' : 'Enviar Dados'}
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="w-full"
              >
                Sair
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};