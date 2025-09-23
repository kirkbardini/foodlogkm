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
      foods: [],
      entries: [],
      users: defaultUsers,
      settings: defaultSettings,

      // Inicialização
      initializeApp: async () => {
        set({ isLoading: true, error: null });
        try {
          await database.init();
          // Carregar dados locais como fallback
          await get().loadInitialData();
          await get().autoSelectUser();
        } catch (error) {
          set({ error: 'Erro ao inicializar aplicação' });
          console.error('Erro na inicialização:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadInitialData: async () => {
        try {
          const [foods, entries, users] = await Promise.all([
            database.getAllFoods(),
            database.getAllEntries(),
            database.getAllUsers()
          ]);

          // Se não há usuários, cria os padrões
          if (users.length === 0) {
            for (const user of defaultUsers) {
              await database.updateUser(user);
            }
          }

          // Se não há alimentos, carrega a base inicial
          if (foods.length === 0) {
            try {
              const response = await fetch('/foodlogkm/data/foods.min.json');
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const initialFoods = await response.json();
              
              for (const food of initialFoods) {
                await database.addFood(food);
              }
            } catch (error) {
              console.error('Erro ao carregar alimentos iniciais:', error);
            }
          }

          set({ foods, entries, users: users.length > 0 ? users : defaultUsers });
        } catch (error) {
          console.error('Erro ao carregar dados iniciais:', error);
        }
      },

      autoSelectUser: async () => {
        // Esta função será implementada quando o Firebase estiver configurado
        // Por enquanto, mantém o usuário padrão
      },

      // Ações de usuário
      setCurrentUser: (userId) => set({ currentUser: userId }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setUsers: (users) => set({ users }),
      setError: (error) => set({ error }),

      // Ações de alimentos
      addFood: async (foodData) => {
        const food: FoodItem = {
          ...foodData,
          id: generateId()
        };
        
        console.log(`🍎 Adicionando alimento local: ${food.name} (${food.id})`);
        await database.addFood(food);
        set(state => ({ foods: [...state.foods, food] }));
        console.log(`✅ Alimento salvo localmente: ${food.name}`);
        
        // Sincronização automática com Firebase
        await syncToFirebase(() => firebaseSyncService.saveFood(food), `alimento ${food.name}`);
      },

      updateFood: async (food) => {
        await database.updateFood(food);
        set(state => ({
          foods: state.foods.map(f => f.id === food.id ? food : f)
        }));
        
        // Sincronização automática com Firebase
        await syncToFirebase(() => firebaseSyncService.saveFood(food), `alimento ${food.name}`);
      },

      deleteFood: async (id) => {
        const food = get().foods.find(f => f.id === id);
        await database.deleteFood(id);
        set(state => ({
          foods: state.foods.filter(f => f.id !== id)
        }));
        
        // Sincronização automática com Firebase
        if (food) {
          await syncToFirebase(() => firebaseSyncService.deleteFood(id), `alimento ${food.name}`);
        }
      },

      searchFoods: (query) => {
        const { foods } = get();
        return foods.filter(food => 
          food.name.toLowerCase().includes(query.toLowerCase()) ||
          food.category.toLowerCase().includes(query.toLowerCase())
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
        
        // Sincronização automática com Firebase
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
        
        // Sincronização automática com Firebase
        await syncToFirebase(() => firebaseSyncService.saveEntry(updatedEntry), `entrada ${updatedEntry.foodId}`);
      },

      deleteEntry: async (id) => {
        const entry = get().entries.find(e => e.id === id);
        await database.deleteEntry(id);
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
        
        // Sincronização automática com Firebase
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
          
          // Sincronização automática com Firebase
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
        const result = await database.cleanAllDuplicates();
        // Recarregar dados após limpeza
        await get().loadInitialData();
        return result;
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
