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
  AppSettings,
  CalorieExpenditure 
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
  calorieExpenditure: CalorieExpenditure[];
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

  // Ações de calorie expenditure
  addCalorieExpenditure: (calorieExpenditure: Omit<CalorieExpenditure, 'id'>) => Promise<void>;
  updateCalorieExpenditure: (calorieExpenditure: CalorieExpenditure) => Promise<void>;
  deleteCalorieExpenditure: (id: string) => Promise<void>;

  // Ações de consulta
  getEntriesForDate: (userId: UserId, date: string) => Entry[];
  getEntriesForDateRange: (userId: UserId, startDate: string, endDate: string) => Entry[];
  getCalorieExpenditureForDate: (userId: UserId, date: string) => CalorieExpenditure[];
  getCalorieExpenditureForDateRange: (userId: UserId, startDate: string, endDate: string) => CalorieExpenditure[];

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
  getDailyCalorieBalance: (userId: UserId, date: string) => { intake: number; expenditure: number; balance: number };
  getCalorieBalanceForDateRange: (userId: UserId, startDate: string, endDate: string) => { intake: number; expenditure: number; balance: number };
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
    },
    minimumRequirements: {
      protein_g: 125,
      carbs_g: 160,
      fat_g: 40,
      kcal: 1500
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
    },
    minimumRequirements: {
      protein_g: 96,
      carbs_g: 120,
      fat_g: 25,
      kcal: 1100
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
      calorieExpenditure: [],
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
          // Carregando dados iniciais...
          const [foods, entries, calorieExpenditure, users] = await Promise.all([
            database.getAllFoods(),
            database.getAllEntries(),
            database.getAllCalorieExpenditure(),
            database.getAllUsers()
          ]);

          // Dados carregados

          // Se não há usuários, cria os padrões
          if (users.length === 0) {
            // Criando usuários padrão...
            for (const user of defaultUsers) {
              await database.updateUser(user);
            }
          }

          // Usar dados locais carregados
          set({ foods, entries, calorieExpenditure, users: users.length > 0 ? users : defaultUsers });
          console.log(`✅ Aplicação inicializada (LOCAL): ${foods.length} alimentos, ${entries.length} entradas, ${calorieExpenditure.length} calorie expenditure, ${users.length} usuários`);
        } catch (error) {
          console.error('Erro ao carregar dados iniciais:', error);
          // Em caso de erro, usar dados vazios
          set({ foods: [], entries: [], calorieExpenditure: [], users: defaultUsers });
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
            console.log(`✅ Alimento sincronizado (LOCAL → FIREBASE): ${food.name}`);
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
            console.log(`✅ Alimento atualizado (LOCAL → FIREBASE): ${updatedFood.name}`);
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
          console.log(`✅ Alimento deletado (LOCAL → FIREBASE): ${foodToDelete.name}`);
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
        
        // Obter nome do alimento para logs
        const food = get().foods.find(f => f.id === entry.foodId);
        const foodName = food?.name || 'Alimento não encontrado';
        
        console.log(`📝 Entrada adicionada: ${foodName} (${entry.dateISO})`);
        console.log(`✅ Entrada salva localmente: ${entry.id}`);
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        await syncToFirebase(() => firebaseSyncService.saveEntry(entry), `entrada ${foodName}`);
        console.log(`✅ Entrada sincronizada (LOCAL → FIREBASE): ${foodName} (${entry.dateISO})`);
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
        
        // Obter nome do alimento para logs
        const food = get().foods.find(f => f.id === updatedEntry.foodId);
        const foodName = food?.name || 'Alimento não encontrado';
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        await syncToFirebase(() => firebaseSyncService.saveEntry(updatedEntry), `entrada ${foodName}`);
        console.log(`✅ Entrada atualizada (LOCAL → FIREBASE): ${foodName} (${updatedEntry.dateISO})`);
      },

      deleteEntry: async (id) => {
        // ✅ Buscar entry ANTES de deletar para manter informações completas
        const entry = get().entries.find(e => e.id === id);
        await database.deleteEntry(id);
        
        // Obter nome do alimento para logs
        const food = entry ? get().foods.find(f => f.id === entry.foodId) : null;
        const foodName = food?.name || 'Alimento não encontrado';
        
        console.log(`🗑️ Entrada deletada: ${foodName} (${entry?.dateISO})`);
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
        
        // Sincronização automática com Firebase (GRADUAL - entradas)
        if (entry) {
          console.log(`🔄 Sincronizando deleção com Firebase: ${foodName} (${entry.dateISO})`);
          await syncToFirebase(() => firebaseSyncService.deleteEntry(id), `entrada ${foodName} (${entry.dateISO})`);
          console.log(`✅ Entrada deletada (LOCAL → FIREBASE): ${foodName} (${entry.dateISO})`);
        } else {
          console.warn(`⚠️ Entrada não encontrada para sincronização: ${id}`);
        }
      },

      // Ações de calorie expenditure
      addCalorieExpenditure: async (calorieExpenditureData) => {
        const now = Date.now();
        const calorieExpenditure: CalorieExpenditure = {
          ...calorieExpenditureData,
          id: (calorieExpenditureData as any).id || generateId(),
          createdAt: (calorieExpenditureData as any).createdAt || now,
          updatedAt: now
        };
        
        await database.addCalorieExpenditure(calorieExpenditure);
        set(state => ({ calorieExpenditure: [...state.calorieExpenditure, calorieExpenditure] }));
        
        console.log(`🔥 Calorie expenditure adicionado: ${calorieExpenditure.calories_burned} kcal (${calorieExpenditure.dateISO})`);
        console.log(`✅ Calorie expenditure salvo localmente: ${calorieExpenditure.id}`);
        
        // Sincronização automática com Firebase
        await syncToFirebase(() => firebaseSyncService.saveCalorieExpenditure(calorieExpenditure), `calorie expenditure ${calorieExpenditure.calories_burned} kcal`);
        console.log(`✅ Calorie expenditure sincronizado (LOCAL → FIREBASE): ${calorieExpenditure.calories_burned} kcal (${calorieExpenditure.dateISO})`);
      },

      updateCalorieExpenditure: async (calorieExpenditure) => {
        const updatedCalorieExpenditure = {
          ...calorieExpenditure,
          updatedAt: Date.now()
        };
        
        await database.updateCalorieExpenditure(updatedCalorieExpenditure);
        set(state => ({
          calorieExpenditure: state.calorieExpenditure.map(ce => ce.id === calorieExpenditure.id ? updatedCalorieExpenditure : ce)
        }));
        
        // Sincronização automática com Firebase
        await syncToFirebase(() => firebaseSyncService.saveCalorieExpenditure(updatedCalorieExpenditure), `calorie expenditure ${updatedCalorieExpenditure.calories_burned} kcal`);
        console.log(`✅ Calorie expenditure atualizado (LOCAL → FIREBASE): ${updatedCalorieExpenditure.calories_burned} kcal (${updatedCalorieExpenditure.dateISO})`);
      },

      deleteCalorieExpenditure: async (id) => {
        const calorieExpenditure = get().calorieExpenditure.find(ce => ce.id === id);
        await database.deleteCalorieExpenditure(id);
        
        console.log(`🗑️ Calorie expenditure deletado: ${calorieExpenditure?.calories_burned} kcal (${calorieExpenditure?.dateISO})`);
        set(state => ({
          calorieExpenditure: state.calorieExpenditure.filter(ce => ce.id !== id)
        }));
        
        // Sincronização automática com Firebase
        if (calorieExpenditure) {
          console.log(`🔄 Sincronizando deleção com Firebase: ${calorieExpenditure.calories_burned} kcal (${calorieExpenditure.dateISO})`);
          await syncToFirebase(() => firebaseSyncService.deleteCalorieExpenditure(id), `calorie expenditure ${calorieExpenditure.calories_burned} kcal (${calorieExpenditure.dateISO})`);
          console.log(`✅ Calorie expenditure deletado (LOCAL → FIREBASE): ${calorieExpenditure.calories_burned} kcal (${calorieExpenditure.dateISO})`);
        } else {
          console.warn(`⚠️ Calorie expenditure não encontrado para sincronização: ${id}`);
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

      getCalorieExpenditureForDate: (userId, date) => {
        const { calorieExpenditure } = get();
        return calorieExpenditure.filter(ce => 
          ce.userId === userId && ce.dateISO === date
        );
      },

      getCalorieExpenditureForDateRange: (userId, startDate, endDate) => {
        const { calorieExpenditure } = get();
        return calorieExpenditure.filter(ce => 
          ce.userId === userId && 
          ce.dateISO >= startDate && 
          ce.dateISO <= endDate
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

      getDailyCalorieBalance: (userId, date) => {
        const entries = get().getEntriesForDate(userId, date);
        const calorieExpenditure = get().getCalorieExpenditureForDate(userId, date);
        
        const intake = calculateTotals(entries).kcal;
        const expenditure = calorieExpenditure.reduce((sum, ce) => sum + ce.calories_burned, 0);
        const balance = intake - expenditure;
        
        return { intake, expenditure, balance };
      },

      getCalorieBalanceForDateRange: (userId, startDate, endDate) => {
        const entries = get().getEntriesForDateRange(userId, startDate, endDate);
        const calorieExpenditure = get().getCalorieExpenditureForDateRange(userId, startDate, endDate);
        
        const intake = calculateTotals(entries).kcal;
        const expenditure = calorieExpenditure.reduce((sum, ce) => sum + ce.calories_burned, 0);
        const balance = intake - expenditure;
        
        return { intake, expenditure, balance };
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
