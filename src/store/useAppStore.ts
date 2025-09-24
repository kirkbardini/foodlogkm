import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { database } from '../lib/database';
import { firebaseSyncService } from '../lib/firebaseSync';
import { 
  FoodItem, 
  Entry, 
  UserPrefs, 
  UserId, 
  AppStateBackup, 
  NutritionTotals,
  AppSettings 
} from '../types';
import { calculateTotals, generateId } from '../lib/calculations';

// Sistema de temas para usuários
export const userThemes = {
  kirk: {
    name: 'Kirk',
    gradient: 'from-blue-600 via-purple-600 to-indigo-700',
    bgGradient: 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700',
    textColor: 'text-white',
    accentColor: 'text-blue-300',
    cardBg: 'bg-blue-50/90',
    borderColor: 'border-blue-200',
    subtleBg: 'bg-blue-50/60'
  },
  manu: {
    name: 'Manu',
    gradient: 'from-pink-500 via-rose-400 to-yellow-400',
    bgGradient: 'bg-gradient-to-br from-pink-500 via-rose-400 to-yellow-400',
    textColor: 'text-white',
    accentColor: 'text-pink-300',
    cardBg: 'bg-pink-50/90',
    borderColor: 'border-pink-200',
    subtleBg: 'bg-pink-50/60'
  }
} as const;

interface AppState {
  // Estado da aplicação
  currentUser: UserId;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;

  // Dados
  foods: FoodItem[];
  entries: Entry[];
  users: UserPrefs[];
  settings: AppSettings;

  // Ações de inicialização
  initializeApp: () => Promise<void>;
  loadInitialData: () => Promise<void>;
  autoSelectUser: () => Promise<void>;

  // Ações de usuário
  setCurrentUser: (userId: UserId) => void;
  setSelectedDate: (date: string) => void;
  setUsers: (users: UserPrefs[]) => void;
  setAuthenticated: (auth: boolean) => void;
  setError: (error: string | null) => void;
  
  // Listeners em tempo real
  setupRealtimeListeners: () => Promise<void>;

  // Ações de alimentos
  addFood: (food: Omit<FoodItem, 'id'>) => Promise<void>;
  updateFood: (food: FoodItem) => Promise<void>;
  deleteFood: (id: string) => Promise<void>;
  searchFoods: (query: string) => FoodItem[];
  importFoods: (foods: FoodItem[]) => Promise<{ added: number; updated: number }>;

  // Ações de entradas
  addEntry: (entry: Omit<Entry, 'id'>) => Promise<void>;
  addEntryFromSync: (entry: Entry) => void;
  updateEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // Ações de consulta
  getEntriesForDate: (userId: UserId, date: string) => Entry[];
  getEntriesForDateRange: (userId: UserId, startDate: string, endDate: string) => Entry[];

  // Sistema de temas
  getCurrentUserTheme: () => typeof userThemes.kirk | typeof userThemes.manu;

  // Ações de usuários - updateUserGoals removida (deprecada)

  // Ações de backup
  exportBackup: () => Promise<AppStateBackup>;
  importBackup: (backup: AppStateBackup) => Promise<void>;
  cleanDuplicates: () => Promise<{ foods: { removed: number; kept: number }; entries: { removed: number; kept: number } }>;

  // Ações de configurações
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Cálculos
  getDailyTotals: (userId: UserId, date: string) => NutritionTotals;
}

const defaultUsers: UserPrefs[] = [
  {
    id: 'kirk',
    name: 'Kirk',
    goals: {
      protein_g: 160,
      carbs_g: 220,
      fat_g: 60,
      kcal: 2400,
      water_ml: 3000
    }
  },
  {
    id: 'manu',
    name: 'Manu',
    goals: {
      protein_g: 120,
      carbs_g: 180,
      fat_g: 50,
      kcal: 2000,
      water_ml: 2500
    }
  }
];

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'pt',
  defaultUnit: 'g'
};

// Função auxiliar para sincronização rápida e segura
const syncToFirebase = async (operation: () => Promise<void>, itemType: string) => {
  try {
    console.log(`🔄 Iniciando sincronização: ${itemType}`);
    await operation();
    console.log(`✅ ${itemType} sincronizado com Firebase`);
  } catch (error) {
    console.error(`❌ Falha na sincronização de ${itemType}:`, error);
    // Não falha a operação local se o Firebase falhar
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentUser: 'kirk',
      selectedDate: new Date().toISOString().split('T')[0],
      isLoading: false,
      error: null,
      isInitialized: false,
      isAuthenticated: false,
      foods: [],
      entries: [],
      users: defaultUsers,
      settings: defaultSettings,

      // Inicialização
      initializeApp: async () => {
        const { isInitialized, isLoading } = get();
        if (isInitialized || isLoading) {
          console.log('⚠️ Aplicação já inicializada ou em processo, pulando...');
          return;
        }
        
        set({ isLoading: true, error: null });
        try {
          console.log('🚀 Inicializando aplicação...');
          await database.init();
          // Carregar dados locais como fallback
          await get().loadInitialData();
          await get().autoSelectUser();
          
          // Configurar listener em tempo real para alimentos - DESABILITADO temporariamente
          // await get().setupRealtimeListeners();
          
          set({ isInitialized: true });
          console.log('✅ Aplicação inicializada com sucesso');
        } catch (error) {
          set({ error: 'Erro ao inicializar aplicação' });
          console.error('Erro na inicialização:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadInitialData: async () => {
        try {
          console.log('📊 Carregando dados iniciais...');
          const [foods, entries, users] = await Promise.all([
            database.getAllFoods(),
            database.getAllEntries(),
            database.getAllUsers()
          ]);

          console.log(`📊 Dados carregados: ${foods.length} alimentos, ${entries.length} entradas, ${users.length} usuários`);

          // Se não há usuários, cria os padrões
          if (users.length === 0) {
            console.log('👥 Criando usuários padrão...');
            for (const user of defaultUsers) {
              await database.updateUser(user);
            }
          }

          // Carregar dados do Firebase apenas se necessário
          try {
            console.log('🍎 Verificando sincronização com Firebase...');
            
            // Verificar se já temos dados locais suficientes
            const localFoods = await database.getAllFoods();
            const localUsers = await database.getAllUsers();
            const localEntries = await database.getAllEntries();
            
            if (localFoods.length > 0 && localUsers.length > 0) {
              console.log(`✅ Dados locais encontrados: ${localFoods.length} alimentos, ${localUsers.length} usuários, ${localEntries.length} entradas`);
              console.log('🔄 Verificando se há dados mais recentes no Firebase...');
              
              // Sempre verificar Firebase para detectar novas entradas/alimentos
              const { foods: firebaseFoods, users: firebaseUsers, entries: firebaseEntries } = await firebaseSyncService.loadAllUsersData();
              console.log(`📦 Firebase: ${firebaseFoods.length} alimentos, ${firebaseUsers.length} usuários, ${firebaseEntries.length} entradas`);
              
              // Verificar se há diferenças (adições, atualizações ou deleções)
              const hasDifferences = firebaseEntries.length !== localEntries.length || 
                                    firebaseFoods.length !== localFoods.length ||
                                    firebaseUsers.length !== localUsers.length;
              
              if (hasDifferences) {
                console.log('🔄 Diferenças detectadas entre local e Firebase, sincronizando...');
                
                // Sincronizar alimentos (Firebase é a fonte da verdade)
                console.log('🔄 Sincronizando alimentos: Firebase → Local');
                
                // 1. Adicionar/atualizar alimentos do Firebase
                let foodsUpdated = 0;
                let foodsAdded = 0;
                let foodsErrors = 0;
                
                for (const firebaseFood of firebaseFoods) {
                  try {
                    const existingFood = await database.getFood(firebaseFood.id);
                    if (existingFood) {
                      const localUpdatedAt = existingFood.updatedAt || 0;
                      const firebaseUpdatedAt = firebaseFood.updatedAt || 0;
                      if (firebaseUpdatedAt > localUpdatedAt) {
                        await database.updateFood(firebaseFood);
                        foodsUpdated++;
                      }
                    } else {
                      await database.addFood(firebaseFood);
                      foodsAdded++;
                    }
                  } catch (error) {
                    foodsErrors++;
                    console.warn(`⚠️ Erro ao sincronizar alimento ${firebaseFood.name}:`, error);
                  }
                }
                
                if (foodsUpdated > 0 || foodsAdded > 0) {
                  console.log(`🍎 Alimentos sincronizados: ${foodsAdded} novos, ${foodsUpdated} atualizados`);
                }
                if (foodsErrors > 0) {
                  console.warn(`⚠️ ${foodsErrors} erros ao sincronizar alimentos`);
                }
                
                // 2. Deletar alimentos locais que não existem no Firebase
                const firebaseFoodIds = new Set(firebaseFoods.map(f => f.id));
                const localFoods = await database.getAllFoods();
                const foodsToDelete = localFoods.filter(food => !firebaseFoodIds.has(food.id));
                
                if (foodsToDelete.length > 0) {
                  for (const food of foodsToDelete) {
                    await database.deleteFood(food.id);
                  }
                  console.log(`🗑️ ${foodsToDelete.length} alimentos deletados localmente (não existem no Firebase)`);
                }
                
                // Sincronizar entradas (Firebase é a fonte da verdade)
                console.log('🔄 Sincronizando entradas: Firebase → Local');
                
                // 1. Adicionar/atualizar entradas do Firebase
                let entriesUpdated = 0;
                let entriesAdded = 0;
                let entriesErrors = 0;
                
                for (const firebaseEntry of firebaseEntries) {
                  try {
                    const existingEntry = await database.getEntry(firebaseEntry.id);
                    if (existingEntry) {
                      const localUpdatedAt = existingEntry.updatedAt || 0;
                      const firebaseUpdatedAt = firebaseEntry.updatedAt || 0;
                      if (firebaseUpdatedAt > localUpdatedAt) {
                        await database.updateEntry(firebaseEntry);
                        entriesUpdated++;
                      }
                    } else {
                      await database.addEntry(firebaseEntry);
                      entriesAdded++;
                    }
                  } catch (error) {
                    entriesErrors++;
                    console.warn(`⚠️ Erro ao sincronizar entrada ${firebaseEntry.id}:`, error);
                  }
                }
                
                if (entriesUpdated > 0 || entriesAdded > 0) {
                  console.log(`📝 Entradas sincronizadas: ${entriesAdded} novas, ${entriesUpdated} atualizadas`);
                }
                if (entriesErrors > 0) {
                  console.warn(`⚠️ ${entriesErrors} erros ao sincronizar entradas`);
                }
                
                // 2. Deletar entradas locais que não existem no Firebase
                const firebaseEntryIds = new Set(firebaseEntries.map(e => e.id));
                const localEntries = await database.getAllEntries();
                const entriesToDelete = localEntries.filter(entry => !firebaseEntryIds.has(entry.id));
                
                if (entriesToDelete.length > 0) {
                  for (const entry of entriesToDelete) {
                    await database.deleteEntry(entry.id);
                  }
                  console.log(`🗑️ ${entriesToDelete.length} entradas deletadas localmente (não existem no Firebase)`);
                }
                
                // Atualizar usuários
                for (const user of firebaseUsers) {
                  await database.updateUser(user);
                }
                console.log(`👤 ${firebaseUsers.length} usuários atualizados do Firebase`);
                
                // Recarregar dados atualizados
                const updatedFoods = await database.getAllFoods();
                const updatedUsers = await database.getAllUsers();
                const updatedEntries = await database.getAllEntries();
                console.log(`✅ Sincronização concluída: ${updatedFoods.length} alimentos, ${updatedUsers.length} usuários, ${updatedEntries.length} entradas`);
                set({ foods: updatedFoods, entries: updatedEntries, users: updatedUsers });
              } else {
                console.log('📱 Dados locais estão atualizados - usando dados locais');
                set({ foods: localFoods, entries: localEntries, users: localUsers });
              }
            } else {
              console.log('🔄 Dados locais insuficientes, carregando do Firebase...');
              const { foods: firebaseFoods, users: firebaseUsers, entries: firebaseEntries } = await firebaseSyncService.loadAllUsersData();
              console.log(`📦 Encontrados ${firebaseFoods.length} alimentos, ${firebaseUsers.length} usuários e ${firebaseEntries.length} entradas no Firebase`);
              
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
                      await database.updateFood(firebaseFood);
                      console.log(`🔄 Alimento atualizado do Firebase: ${firebaseFood.name}`);
                    } else {
                      // Local é mais recente ou igual - manter local
                      console.log(`✅ Alimento local mais recente: ${firebaseFood.name}`);
                    }
                  } else {
                    // Alimento não existe localmente - adicionar
                    await database.addFood(firebaseFood);
                    console.log(`✅ Alimento adicionado do Firebase: ${firebaseFood.name}`);
                  }
                } catch (error) {
                  console.warn(`⚠️ Erro ao sincronizar alimento ${firebaseFood.name}:`, error);
                }
              }
              
              // NÃO enviar alimentos locais para o Firebase para evitar duplicatas
              console.log('📱 Sincronização unidirecional concluída - Firebase é a fonte da verdade');
              
              // Sincronização inteligente de entradas: Firebase → Local
              console.log('🔄 Sincronizando entradas do Firebase para local...');
              
              for (const firebaseEntry of firebaseEntries) {
                try {
                  const existingEntry = await database.getEntry(firebaseEntry.id);
                  
                  if (existingEntry) {
                    // Entrada já existe localmente - verificar se precisa atualizar
                    const localUpdatedAt = existingEntry.updatedAt || 0;
                    const firebaseUpdatedAt = firebaseEntry.updatedAt || 0;
                    
                    if (firebaseUpdatedAt > localUpdatedAt) {
                      // Firebase é mais recente - atualizar local
                      await database.updateEntry(firebaseEntry);
                      console.log(`🔄 Entrada atualizada do Firebase: ${firebaseEntry.foodId} (${firebaseEntry.dateISO})`);
                    } else {
                      // Local é mais recente ou igual - manter local
                      console.log(`✅ Entrada local mais recente: ${firebaseEntry.foodId} (${firebaseEntry.dateISO})`);
                    }
                  } else {
                    // Entrada não existe localmente - adicionar
                    await database.addEntry(firebaseEntry);
                    console.log(`✅ Entrada adicionada do Firebase: ${firebaseEntry.foodId} (${firebaseEntry.dateISO})`);
                  }
                } catch (error) {
                  console.warn(`⚠️ Erro ao sincronizar entrada ${firebaseEntry.id}:`, error);
                }
              }
              
              // Atualizar usuários do Firebase (metas)
              for (const user of firebaseUsers) {
                await database.updateUser(user);
                console.log(`👤 Usuário atualizado do Firebase: ${user.name}`);
              }
              
              // Carregar todos os dados do IndexedDB para o estado
              const allFoods = await database.getAllFoods();
              const allUsers = await database.getAllUsers();
              const allEntries = await database.getAllEntries();
              console.log(`✅ ${allFoods.length} alimentos, ${allUsers.length} usuários e ${allEntries.length} entradas carregados do Firebase`);
              set({ foods: allFoods, entries: allEntries, users: allUsers });
            }
          } catch (error) {
            console.error('Erro ao carregar dados do Firebase:', error);
            // Fallback: usar dados locais se Firebase falhar
            set({ foods, entries, users: users.length > 0 ? users : defaultUsers });
          }
        } catch (error) {
          console.error('Erro ao carregar dados iniciais:', error);
          // Em caso de erro, usar dados vazios
          set({ foods: [], entries: [], users: defaultUsers });
        }
      },

      autoSelectUser: async () => {
        // Esta função será implementada quando o Firebase estiver configurado
        // Por enquanto, mantém o usuário padrão
      },

      // Configurar listeners em tempo real
      setupRealtimeListeners: async () => {
        try {
          console.log('🔄 Configurando listeners em tempo real...');
          
          // Listener para alimentos
          firebaseSyncService.onFoodsChange(async (firebaseFoods) => {
            console.log('🔄 Alimentos atualizados em tempo real:', firebaseFoods.length);
            
            // Atualizar IndexedDB (cache local) com lógica upsert
            for (const food of firebaseFoods) {
              try {
                // Verificar se alimento já existe
                const existingFood = await database.getFood(food.id);
                if (existingFood) {
                  // Atualizar se já existe
                  await database.updateFood(food);
                  console.log(`🔄 Alimento atualizado: ${food.name}`);
                } else {
                  // Adicionar se não existe
                  await database.addFood(food);
                  console.log(`✅ Alimento adicionado: ${food.name}`);
                }
              } catch (error) {
                console.warn(`⚠️ Erro ao sincronizar alimento ${food.name}:`, error);
              }
            }
            
            // Atualizar estado
            set({ foods: firebaseFoods });
          });
          
          console.log('✅ Listeners configurados');
        } catch (error) {
          console.error('Erro ao configurar listeners:', error);
        }
      },

      // Ações de usuário
      setCurrentUser: (userId) => set({ currentUser: userId }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setUsers: (users) => set({ users }),
      setAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),
      setError: (error) => set({ error }),

      // Ações de alimentos
          addFood: async (foodData) => {
            const now = Date.now();
            const food: FoodItem = {
              ...foodData,
              id: (foodData as any).id || generateId(), // Preservar ID existente ou gerar novo
              createdAt: (foodData as any).createdAt || now,
              updatedAt: now
            };
            
            await database.addFood(food);
            set(state => ({ foods: [...state.foods, food] }));
            console.log(`🍎 Alimento adicionado: ${food.name}`);
            console.log(`✅ Alimento salvo localmente: ${food.name}`);
            
            // Sincronização automática com Firebase (GRADUAL - alimentos)
            await syncToFirebase(() => firebaseSyncService.saveFood(food), `alimento ${food.name}`);
          },

          updateFood: async (food) => {
            const updatedFood = {
              ...food,
              updatedAt: Date.now()
            };
            
            await database.updateFood(updatedFood);
            set(state => ({
              foods: state.foods.map(f => f.id === food.id ? updatedFood : f)
            }));
            
            // Sincronização automática com Firebase (GRADUAL - alimentos)
            await syncToFirebase(() => firebaseSyncService.saveFood(updatedFood), `alimento ${updatedFood.name}`);
          },

      deleteFood: async (id) => {
        // Buscar dados do alimento antes de deletar
        const foodToDelete = get().foods.find(f => f.id === id);
        await database.deleteFood(id);
        console.log(`🗑️ Alimento deletado: ${foodToDelete?.name}`);
        set(state => ({
          foods: state.foods.filter(f => f.id !== id)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - alimentos)
        if (foodToDelete) {
          console.log(`🔄 Sincronizando deleção com Firebase: ${foodToDelete.name}`);
          await syncToFirebase(() => firebaseSyncService.deleteFood(id), `alimento ${foodToDelete.name}`);
        } else {
          console.warn(`⚠️ Alimento não encontrado para sincronização: ${id}`);
        }
      },

      searchFoods: (query) => {
        const { foods } = get();
        if (!query || query.trim() === '') {
          return foods;
        }
        
        const searchTerm = query.toLowerCase().trim();
        return foods.filter(food => 
          food.name.toLowerCase().includes(searchTerm) ||
          food.category.toLowerCase().includes(searchTerm)
        );
      },


      importFoods: async (newFoods) => {
        let added = 0;
        let updated = 0;

        for (const food of newFoods) {
          // Upsert por nome (não por ID) para evitar duplicatas na re-importação
          const existing = get().foods.find(f => f.name.toLowerCase() === food.name.toLowerCase());
          if (existing) {
            // Alimento já existe - atualizar com dados do JSON
            const updatedFood = {
              ...existing,
              ...food,
              id: existing.id, // Preservar ID existente
              createdAt: existing.createdAt, // Preservar createdAt original
              updatedAt: Date.now() // Atualizar timestamp
            };
            await get().updateFood(updatedFood);
            updated++;
            console.log(`🔄 Alimento atualizado: ${food.name}`);
          } else {
            // Alimento não existe - adicionar novo
            await get().addFood(food);
            added++;
            console.log(`✅ Alimento adicionado: ${food.name}`);
          }
        }

        return { added, updated };
      },

      // Ações de entradas
      addEntry: async (entryData) => {
        const now = Date.now();
        const entry: Entry = {
          ...entryData,
          id: (entryData as any).id || generateId(), // Preservar ID existente ou gerar novo
          createdAt: (entryData as any).createdAt || now,
          updatedAt: now,
          water_ml: entryData.water_ml || 0 // Garantir que water_ml nunca seja undefined
        };
        
        await database.addEntry(entry);
        set(state => ({ entries: [...state.entries, entry] }));
        console.log(`📝 Entrada adicionada: ${entry.foodId} (${entry.dateISO})`);
        console.log(`✅ Entrada salva localmente: ${entry.id}`);
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        await syncToFirebase(() => firebaseSyncService.saveEntry(entry), `entrada ${entry.foodId}`);
      },

      addEntryFromSync: (entry) => {
        set(state => ({ entries: [...state.entries, entry] }));
      },

      updateEntry: async (entry) => {
        // Garantir que water_ml nunca seja undefined
        const updatedEntry = {
          ...entry,
          water_ml: entry.water_ml || 0,
          updatedAt: Date.now()
        };
        await database.updateEntry(updatedEntry);
        set(state => ({
          entries: state.entries.map(e => e.id === entry.id ? updatedEntry : e)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        await syncToFirebase(() => firebaseSyncService.saveEntry(updatedEntry), `entrada ${updatedEntry.foodId}`);
      },

      deleteEntry: async (id) => {
        // ✅ Buscar entry ANTES de deletar para manter informações completas
        const entry = get().entries.find(e => e.id === id);
        await database.deleteEntry(id);
        console.log(`🗑️ Entrada deletada: ${entry?.foodId} (${entry?.dateISO})`);
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        if (entry) {
          console.log(`🔄 Sincronizando deleção com Firebase: ${entry.foodId} (${entry.dateISO})`);
          await syncToFirebase(() => firebaseSyncService.deleteEntry(id), `entrada ${entry.foodId} (${entry.dateISO})`);
        } else {
          console.warn(`⚠️ Entrada não encontrada para sincronização: ${id}`);
        }
      },

  // Ações de consulta
  getEntriesForDate: (userId, date) => {
    const { entries } = get();
    return entries.filter(entry => 
      entry.userId === userId && entry.dateISO === date
    );
  },

  // Sistema de temas
  getCurrentUserTheme: () => {
    const { currentUser } = get();
    return userThemes[currentUser] || userThemes.kirk;
  },

      getEntriesForDateRange: (userId, startDate, endDate) => {
        const { entries } = get();
        return entries.filter(entry => 
          entry.userId === userId && 
          entry.dateISO >= startDate && 
          entry.dateISO <= endDate
        );
      },

      // Ações de usuários - updateUserGoals removida (deprecada)

      // Ações de backup
      exportBackup: async () => {
        return await database.exportBackup();
      },

      importBackup: async (backup) => {
        await database.importBackup(backup);
        // Recarregar dados após importação
        await get().loadInitialData();
      },

      // Limpeza de duplicações
      cleanDuplicates: async () => {
        try {
          console.log('🧹 Limpando duplicatas de alimentos e entradas...');
          const result = await database.cleanAllDuplicates();
          console.log(`✅ Limpeza concluída: ${result.foods.removed} alimentos e ${result.entries.removed} entradas removidas`);
          
          // Recarregar dados após limpeza
          await get().loadInitialData();
          return result;
        } catch (error) {
          console.error('Erro ao limpar duplicatas:', error);
          throw error;
        }
      },


      // Ações de configurações
      updateSettings: async (newSettings) => {
        const { settings } = get();
        const updatedSettings = { ...settings, ...newSettings };
        await database.setSetting('app_settings', updatedSettings);
        set({ settings: updatedSettings });
      },

      // Cálculos
      getDailyTotals: (userId, date) => {
        const entries = get().getEntriesForDate(userId, date);
        return calculateTotals(entries);
      },
    }),
    {
      name: 'foodlog-km-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        selectedDate: state.selectedDate,
        settings: state.settings
        // users não é persistido - Firebase é a fonte da verdade
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedDate = new Date().toISOString().split('T')[0];
          // Firebase é a fonte da verdade - limpar dados locais dos usuários
          // para evitar conflitos com dados do Firebase
          if (state.users) {
            console.log('🧹 Limpando dados locais dos usuários - Firebase é a fonte da verdade');
            state.users = [];
          }
        }
      }
    }
  )
);
