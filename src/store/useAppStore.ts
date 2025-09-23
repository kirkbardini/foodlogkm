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

interface AppState {
  // Estado da aplicação
  currentUser: UserId;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

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

  // Ações de usuários
  updateUserGoals: (userId: UserId, goals: UserPrefs['goals']) => Promise<void>;

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
    await operation();
    console.log(`✅ ${itemType} sincronizado com Firebase`);
  } catch (error) {
    console.warn(`⚠️ Falha na sincronização de ${itemType}:`, error);
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
            
            if (localFoods.length > 0 && localUsers.length > 0) {
              console.log(`✅ Dados locais encontrados: ${localFoods.length} alimentos, ${localUsers.length} usuários`);
              console.log('📱 Usando dados locais - Firebase já sincronizado');
              set({ foods: localFoods, entries, users: localUsers });
            } else {
              console.log('🔄 Dados locais insuficientes, carregando do Firebase...');
              const { foods: firebaseFoods, users: firebaseUsers } = await firebaseSyncService.loadAllUsersData();
              console.log(`📦 Encontrados ${firebaseFoods.length} alimentos e ${firebaseUsers.length} usuários no Firebase`);
              
              // Sincronização inteligente com timestamp comparison
              for (const firebaseFood of firebaseFoods) {
                try {
                  const existingFood = await database.getFood(firebaseFood.id);
                  
                  if (existingFood) {
                    // Comparar timestamps
                    const localUpdatedAt = existingFood.updatedAt || 0;
                    const firebaseUpdatedAt = firebaseFood.updatedAt || 0;
                    
                    if (firebaseUpdatedAt > localUpdatedAt) {
                      // Firebase é mais recente - atualizar local
                      await database.updateFood(firebaseFood);
                      console.log(`🔄 Alimento atualizado do Firebase (${new Date(firebaseUpdatedAt).toLocaleString()}): ${firebaseFood.name}`);
                    } else if (localUpdatedAt > firebaseUpdatedAt) {
                      // Local é mais recente - atualizar Firebase
                      await firebaseSyncService.saveFood(existingFood);
                      console.log(`📤 Alimento local enviado para Firebase: ${existingFood.name}`);
                    } else {
                      // Mesmo timestamp - sem mudanças
                      console.log(`✅ Alimento já sincronizado: ${firebaseFood.name}`);
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
              
              // Atualizar usuários do Firebase (metas)
              for (const user of firebaseUsers) {
                await database.updateUser(user);
                console.log(`👤 Usuário atualizado do Firebase: ${user.name}`);
              }
              
              // Carregar todos os dados do IndexedDB para o estado
              const allFoods = await database.getAllFoods();
              const allUsers = await database.getAllUsers();
              console.log(`✅ ${allFoods.length} alimentos e ${allUsers.length} usuários carregados do Firebase`);
              set({ foods: allFoods, entries, users: allUsers });
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
      setError: (error) => set({ error }),

      // Ações de alimentos
          addFood: async (foodData) => {
            const now = Date.now();
            const food: FoodItem = {
              ...foodData,
              id: generateId(),
              createdAt: now,
              updatedAt: now
            };
            
            console.log(`🍎 Adicionando alimento local: ${food.name} (${food.id})`);
            await database.addFood(food);
            set(state => ({ foods: [...state.foods, food] }));
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
        await database.deleteFood(id);
        set(state => ({
          foods: state.foods.filter(f => f.id !== id)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - alimentos)
        const food = get().foods.find(f => f.id === id);
        if (food) {
          await syncToFirebase(() => firebaseSyncService.deleteFood(id), `alimento ${food.name}`);
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
          const existing = get().foods.find(f => f.id === food.id);
          if (existing) {
            await get().updateFood(food);
            updated++;
          } else {
            await get().addFood(food);
            added++;
          }
        }

        return { added, updated };
      },

      // Ações de entradas
      addEntry: async (entryData) => {
        const entry: Entry = {
          ...entryData,
          id: generateId(),
          water_ml: entryData.water_ml || 0 // Garantir que water_ml nunca seja undefined
        };
        
        console.log(`📝 Adicionando entrada local: ${entry.id} (${entry.foodId})`);
        await database.addEntry(entry);
        set(state => ({ entries: [...state.entries, entry] }));
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
          water_ml: entry.water_ml || 0
        };
        await database.updateEntry(updatedEntry);
        set(state => ({
          entries: state.entries.map(e => e.id === entry.id ? updatedEntry : e)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        await syncToFirebase(() => firebaseSyncService.saveEntry(updatedEntry), `entrada ${updatedEntry.foodId}`);
      },

      deleteEntry: async (id) => {
        // Buscar entrada ANTES de remover do estado
        const entry = get().entries.find(e => e.id === id);
        
        await database.deleteEntry(id);
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        if (entry) {
          await syncToFirebase(() => firebaseSyncService.deleteEntry(id), `entrada ${entry.foodId}`);
        }
      },

      // Ações de consulta
      getEntriesForDate: (userId, date) => {
        const { entries } = get();
        return entries.filter(entry => 
          entry.userId === userId && entry.dateISO === date
        );
      },

      getEntriesForDateRange: (userId, startDate, endDate) => {
        const { entries } = get();
        return entries.filter(entry => 
          entry.userId === userId && 
          entry.dateISO >= startDate && 
          entry.dateISO <= endDate
        );
      },

      // Ações de usuários
      updateUserGoals: async (userId, goals) => {
        const { users } = get();
        const updatedUsers = users.map(user => 
          user.id === userId ? { ...user, goals } : user
        );
        
        const updatedUser = updatedUsers.find(u => u.id === userId);
        if (updatedUser) {
          await database.updateUser(updatedUser);
          
          // Sincronização automática com Firebase (GRADUAL - apenas usuários)
          await syncToFirebase(() => firebaseSyncService.saveUsers([updatedUser]), `usuário ${updatedUser.name}`);
        }
        
        set({ users: updatedUsers });
      },

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
