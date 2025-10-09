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
      console.log('✅ Usuário autenticado, verificando sincronização...');
      
      // Mostrar loading durante verificação
      onLoadingChange?.(true);
      
      try {
        // NOVA LÓGICA OTIMIZADA: Verificar se precisa sincronizar
        const userId = firebaseSyncService.getCurrentUserId();
        
        // 1. Inicializar meta/syncState se necessário
        await firebaseSyncService.initializeGlobalSyncState();
        
        // 2. Verificar se precisa sincronizar
        const { needsSync, reason } = await firebaseSyncService.shouldSyncData(userId);
        
          if (needsSync) {
            console.log(`🔄 Sincronização necessária: ${reason}`);
            await loadDataFromFirebase();
            // updateUserLastSync será chamado pelo loadDataFromFirebase
          } else {
            console.log(`✅ Dados já sincronizados: ${reason}`);
            // Carregar dados locais mesmo sem sincronização
            await loadInitialData();
          }
      } catch (error) {
        console.error('❌ Erro na verificação/sincronização:', error);
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
        // checkAuthentication será chamado automaticamente pelo onAuthStateChanged
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
      const { entries: firebaseEntries, foods: firebaseFoods, users: firebaseUsers, calorieExpenditure: firebaseCalorieExpenditure } = await firebaseSyncService.loadAllUsersData();
      
      console.log(`📊 Dados do Firebase: ${firebaseEntries.length} entradas, ${firebaseFoods.length} alimentos, ${firebaseUsers.length} usuários, ${firebaseCalorieExpenditure.length} calorie expenditure`);
      
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
      
      // 3. Atualizar calorie expenditure do Firebase
      for (const calorieExpenditure of firebaseCalorieExpenditure) {
        try {
          const existingCalorieExpenditure = await database.getCalorieExpenditureForDate(calorieExpenditure.userId, calorieExpenditure.dateISO);
          
          if (existingCalorieExpenditure.length > 0) {
            // Calorie expenditure existe - atualizar com dados do Firebase
            await database.updateCalorieExpenditure(calorieExpenditure);
          } else {
            // Calorie expenditure não existe - adicionar do Firebase
            await database.addCalorieExpenditure(calorieExpenditure);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao sincronizar calorie expenditure ${calorieExpenditure.id}:`, error);
        }
      }
      console.log(`🔥 ${firebaseCalorieExpenditure.length} calorie expenditure sincronizados do Firebase`);
      
      // 3.1. Detectar e remover calorie expenditure deletados no Firebase
      const localCalorieExpenditure = await database.getAllCalorieExpenditure();
      const firebaseCalorieExpenditureIds = new Set(firebaseCalorieExpenditure.map(ce => ce.id));
      const calorieExpenditureToDelete = localCalorieExpenditure.filter(ce => !firebaseCalorieExpenditureIds.has(ce.id));
      
      if (calorieExpenditureToDelete.length > 0) {
        console.log(`🗑️ Detectados ${calorieExpenditureToDelete.length} calorie expenditure deletados no Firebase`);
        for (const calorieExpenditure of calorieExpenditureToDelete) {
          try {
            await database.deleteCalorieExpenditure(calorieExpenditure.id);
            console.log(`🗑️ Calorie expenditure deletado localmente: ${calorieExpenditure.id}`);
          } catch (error) {
            console.warn(`⚠️ Erro ao deletar calorie expenditure ${calorieExpenditure.id}:`, error);
          }
        }
        console.log(`✅ ${calorieExpenditureToDelete.length} calorie expenditure deletados localmente`);
      }
      
      // 4. Atualizar estado da aplicação com dados do Firebase
      const updatedFoods = await database.getAllFoods();
      const updatedEntries = await database.getAllEntries();
      const updatedUsers = await database.getAllUsers();
      const updatedCalorieExpenditure = await database.getAllCalorieExpenditure();
      
      // Atualizar estado da aplicação
      useAppStore.setState({ foods: updatedFoods, entries: updatedEntries, users: updatedUsers, calorieExpenditure: updatedCalorieExpenditure });
      
      console.log('✅ Sincronização unidirecional concluída (FIREBASE → LOCAL)');
      setSyncStatus('success');
      
      // Atualizar lastSync após sincronização bem-sucedida
      const userId = firebaseSyncService.getCurrentUserId();
      firebaseSyncService.updateUserLastSync(userId);
      
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
                onClick={loadDataFromFirebase}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Baixando...' : 'Baixar Dados'}
              </Button>
              
              <Button
                onClick={saveDataToFirebase}
                disabled={isLoading}
                variant="secondary"
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