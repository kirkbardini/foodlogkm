import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { firebaseSyncService } from '../lib/firebaseSync';
import { database } from '../lib/database';
import { Card } from './ui/Card';
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
    users,
    setUsers,
    addEntryFromSync,
    addFood,
    updateFood,
    loadInitialData
  } = useAppStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Verificar autenticação - REABILITADO para usuários
  useEffect(() => {
    const unsubscribe = firebaseSyncService.onAuthStateChanged((user) => {
      const authenticated = user !== null;
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        console.log('✅ Usuário autenticado:', user.displayName);
        checkAuthentication();
      } else {
        console.log('❌ Usuário não autenticado');
      }
    });

    return () => unsubscribe();
  }, []);

  // Listener para mudanças de usuários em tempo real - DESABILITADO temporariamente
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     const unsubscribe = firebaseSyncService.onUsersChange((firebaseUsers) => {
  //       console.log('🔄 Usuários atualizados em tempo real do Firebase:', firebaseUsers);
  //       
  //       // Aplicar migração apenas se necessário para TODOS os macros
  //       const migratedUsers = firebaseUsers.map(user => {
  //         const needsMigration = !user.goals.water_ml || user.goals.water_ml === 0;
  //         
  //         if (needsMigration) {
  //           console.log(`🔧 Migrando usuário ${user.name} - aplicando metas padrão`);
  //           return {
  //             ...user,
  //             goals: {
  //               protein_g: user.goals.protein_g || (user.id === 'kirk' ? 160 : 120),
  //                 carbs_g: user.goals.carbs_g || (user.id === 'kirk' ? 220 : 180),
  //                 fat_g: user.goals.fat_g || (user.id === 'kirk' ? 60 : 50),
  //                 kcal: user.goals.kcal || (user.id === 'kirk' ? 2400 : 2000),
  //                 water_ml: user.goals.water_ml || (user.id === 'kirk' ? 3000 : 2500)
  //             }
  //           };
  //         }
  //         
  //         return user;
  //       });
  //       
  //       // Firebase é a fonte da verdade - substitui completamente os dados locais
  //       setUsers(migratedUsers);
  //     });
  //     setUsersListener(() => unsubscribe);
  //   }
  //   
  //   return () => {
  //     if (usersListener) {
  //       usersListener();
  //       setUsersListener(null);
  //     }
  //   };
  // }, [isAuthenticated, setUsers]);

  const checkAuthentication = async () => {
    const user = firebaseSyncService.getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      console.log('✅ Usuário autenticado, verificando sincronização...');
      
      // Mostrar loading durante verificação
      onLoadingChange?.(true);
      
      // DESABILITADO temporariamente para evitar loops
      console.log('✅ Sincronização automática desabilitada temporariamente');
      
      // Simular tempo de carregamento
      setTimeout(() => {
        onLoadingChange?.(false);
      }, 1000);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    onLoadingChange?.(true);
    
    try {
      const success = await firebaseSyncService.signInWithGoogle();
      if (success) {
        setIsAuthenticated(true);
        console.log('✅ Login realizado, verificando sincronização...');
        
        // DESABILITADO temporariamente para evitar loops
        console.log('✅ Sincronização automática desabilitada temporariamente');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleLogout = async () => {
    await firebaseSyncService.signOut();
    setIsAuthenticated(false);
    setSyncStatus('idle');
  };

  const loadDataFromFirebase = async (needsFoods?: boolean, needsEntries?: boolean) => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Se não especificado, carrega tudo (comportamento padrão)
      if (needsFoods === undefined || needsEntries === undefined) {
        const { entries: firebaseEntries, foods: firebaseFoods, users: firebaseUsers } = await firebaseSyncService.loadAllUsersData();
        
        console.log(`📊 Dados carregados do Firebase: ${firebaseEntries.length} entradas, ${firebaseFoods.length} alimentos, ${firebaseUsers.length} usuários`);
        
        // Atualiza alimentos locais com os do Firebase
        console.log(`🔄 Sincronizando ${firebaseFoods.length} alimentos do Firebase...`);
        
        // Sincronização unidirecional: Firebase → Local (evitar duplicatas)
        console.log('🔄 Sincronizando alimentos do Firebase para local...');
        
        for (const firebaseFood of firebaseFoods) {
          try {
            const existingFood = await database.getFood(firebaseFood.id);
            
            if (existingFood) {
              // Alimento já existe localmente - verificar se precisa atualizar
              const localUpdatedAt = existingFood.updatedAt || 0;
              const firebaseUpdatedAt = firebaseFood.updatedAt || 0;
              
              if (firebaseUpdatedAt > localUpdatedAt) {
                // Firebase é mais recente - atualizar local
                await updateFood(firebaseFood);
                console.log(`🔄 Alimento atualizado do Firebase: ${firebaseFood.name}`);
              } else {
                // Local é mais recente ou igual - manter local
                console.log(`✅ Alimento local mais recente: ${firebaseFood.name}`);
              }
            } else {
              // Alimento não existe localmente - adicionar
              await addFood(firebaseFood);
              console.log(`✅ Alimento adicionado do Firebase: ${firebaseFood.name}`);
            }
          } catch (error) {
            console.warn(`⚠️ Erro ao sincronizar alimento ${firebaseFood.name}:`, error);
          }
        }
        
        // Atualiza entradas (merge com existentes) - permite edição de qualquer usuário
        const allEntries = await database.getAllEntries();
        console.log(`📊 Entradas locais: ${allEntries.length}, Firebase: ${firebaseEntries.length}`);
        
        // Verifica quais entradas já existem localmente
        const existingEntryIds = new Set(allEntries.map(e => e.id));
        
        // Adiciona/atualiza todas as entradas do Firebase no IndexedDB
        for (const entry of firebaseEntries) {
          if (existingEntryIds.has(entry.id)) {
            // Entrada já existe - atualiza
            await database.updateEntry(entry);
            console.log(`🔄 Entrada atualizada: ${entry.id}`);
          } else {
            // Entrada não existe - adiciona nova
            await database.addEntry(entry);
            addEntryFromSync(entry);
            console.log(`✅ Entrada adicionada: ${entry.id}`);
          }
        }
        
        if (firebaseUsers.length > 0) {
          // Aplicar migração apenas se necessário para TODOS os macros
          const migratedUsers = firebaseUsers.map(user => {
            const needsMigration = !user.goals.water_ml || user.goals.water_ml === 0;
            
            if (needsMigration) {
              console.log(`🔧 Migrando usuário ${user.name} - aplicando metas padrão`);
              return {
                ...user,
                goals: {
                  protein_g: user.goals.protein_g || (user.id === 'kirk' ? 160 : 120),
                  carbs_g: user.goals.carbs_g || (user.id === 'kirk' ? 220 : 180),
                  fat_g: user.goals.fat_g || (user.id === 'kirk' ? 60 : 50),
                  kcal: user.goals.kcal || (user.id === 'kirk' ? 2400 : 2000),
                  water_ml: user.goals.water_ml || (user.id === 'kirk' ? 3000 : 2500)
              }
            };
          }
          return user;
        });
        setUsers(migratedUsers); // Substitui completamente os usuários locais
      }
      } else {
        // Carregamento seletivo baseado nos parâmetros
        if (needsFoods) {
          console.log('🍎 Carregando apenas alimentos do Firebase...');
          const firebaseFoods = await firebaseSyncService.loadFoods();
          
          // Sincroniza apenas alimentos
          const allFoods = await database.getAllFoods();
          const existingFoodIds = new Set(allFoods.map(f => f.id));
          
          for (const food of firebaseFoods) {
            if (existingFoodIds.has(food.id)) {
              await updateFood(food);
              console.log(`🔄 Alimento atualizado: ${food.name}`);
            } else {
              await addFood(food);
              console.log(`✅ Alimento adicionado: ${food.name}`);
            }
          }
        }
        
        if (needsEntries) {
          console.log('📝 Carregando apenas entradas do Firebase...');
          const currentUser = firebaseSyncService.getCurrentUser();
          if (currentUser) {
            const userId = firebaseSyncService.getUserIdFromEmail(currentUser.email || '');
            const firebaseEntries = await firebaseSyncService.loadEntries(userId);
            
            // Sincroniza apenas entradas
            const allEntries = await database.getAllEntries();
            const existingEntryIds = new Set(allEntries.map(e => e.id));
            
            for (const entry of firebaseEntries) {
              if (existingEntryIds.has(entry.id)) {
                await database.updateEntry(entry);
                console.log(`🔄 Entrada atualizada: ${entry.id}`);
              } else {
                await database.addEntry(entry);
                addEntryFromSync(entry);
                console.log(`✅ Entrada adicionada: ${entry.id}`);
              }
            }
          }
        }
      }
      
      setSyncStatus('success');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDataToFirebase = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // PRIMEIRO: Limpar duplicatas no IndexedDB antes de sincronizar
      console.log('🧹 Limpando duplicatas locais antes da sincronização...');
      const { foodsRemoved, entriesRemoved } = await database.cleanDuplicatesBeforeSync();
      
      if (foodsRemoved > 0 || entriesRemoved > 0) {
        console.log(`✅ Limpeza local concluída: ${foodsRemoved} alimentos e ${entriesRemoved} entradas duplicadas removidas`);
        // Recarregar dados após limpeza
        await loadInitialData();
      }
      
      // Sincroniza usuários (Firebase é a fonte da verdade, não sobrescreve)
      await firebaseSyncService.saveUsers(users);
      console.log('✅ Usuários sincronizados com Firebase');
      
      // Sincroniza entradas
      const entries = await database.getAllEntries();
      await firebaseSyncService.saveEntries(entries);
      console.log(`✅ ${entries.length} entradas sincronizadas com Firebase`);
      
      // Sincroniza alimentos
      const foods = await database.getAllFoods();
      await firebaseSyncService.saveFoods(foods);
      console.log(`✅ ${foods.length} alimentos sincronizados com Firebase`);
      
      // Verificar se há alimentos que foram deletados localmente mas ainda existem no Firebase
      console.log('🔍 Verificando alimentos deletados localmente...');
      const firebaseFoods = await firebaseSyncService.loadFoods();
      const localFoodIds = new Set(foods.map(f => f.id));
      const deletedFoods = firebaseFoods.filter(f => !localFoodIds.has(f.id));
      
      if (deletedFoods.length > 0) {
        console.log(`🗑️ Encontrados ${deletedFoods.length} alimentos para deletar do Firebase:`, deletedFoods.map(f => f.name));
        for (const food of deletedFoods) {
          try {
            await firebaseSyncService.deleteFood(food.id);
            console.log(`✅ Alimento deletado do Firebase: ${food.name}`);
          } catch (error) {
            console.error(`❌ Erro ao deletar alimento ${food.name}:`, error);
          }
        }
      } else {
        console.log('✅ Nenhum alimento deletado localmente encontrado');
      }
      
      setSyncStatus('success');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };



  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Sincronizando...';
      case 'success': return 'Sincronizado';
      case 'error': return 'Erro na sincronização';
      default: return 'Pronto para sincronizar';
    }
  };

  if (isOpen) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="🔄 Sincronização Firebase"
        size="lg"
      >
        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {isAuthenticated ? 'Conectado ao Firebase' : 'Não conectado'}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {!isAuthenticated ? (
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Conectando...' : '🔐 Entrar com Google'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => loadDataFromFirebase()}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Carregando...' : '📥 Baixar Dados'}
                </Button>
                <Button
                  onClick={saveDataToFirebase}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoading ? 'Enviando...' : '📤 Enviar Dados'}
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full"
                >
                  🚪 Sair
                </Button>
              </div>
            )}
          </div>



          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Como Funciona</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>📱 <strong>Dados locais primeiro</strong> - carregamento rápido e offline</li>
              <li>🔄 <strong>Sincronização automática</strong> - mudanças são salvas instantaneamente</li>
              <li>☁️ <strong>Firebase sob demanda</strong> - carrega apenas quando necessário</li>
              <li>🧹 <strong>Sem duplicações</strong> - verificação automática evita duplicatas</li>
              <li>Qualquer usuário pode editar entradas de outros</li>
            </ul>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sincronização</h3>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowSyncModal(true)}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            {isAuthenticated ? 'Gerenciar' : 'Conectar'}
          </Button>
        </div>
      </div>

      {/* Sync Modal */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="🔄 Sincronização Firebase"
        size="lg"
      >
        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {isAuthenticated ? 'Conectado ao Firebase' : 'Não conectado'}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {!isAuthenticated ? (
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Conectando...' : '🔐 Entrar com Google'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => loadDataFromFirebase()}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Carregando...' : '📥 Baixar Dados'}
                </Button>
                <Button
                  onClick={saveDataToFirebase}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoading ? 'Enviando...' : '📤 Enviar Dados'}
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full"
                >
                  🚪 Sair
                </Button>
              </div>
            )}
          </div>



          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Como Funciona</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>📱 <strong>Dados locais primeiro</strong> - carregamento rápido e offline</li>
              <li>🔄 <strong>Sincronização automática</strong> - mudanças são salvas instantaneamente</li>
              <li>☁️ <strong>Firebase sob demanda</strong> - carrega apenas quando necessário</li>
              <li>🧹 <strong>Sem duplicações</strong> - verificação automática evita duplicatas</li>
              <li>Qualquer usuário pode editar entradas de outros</li>
            </ul>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
