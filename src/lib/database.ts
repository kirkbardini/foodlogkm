import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FoodItem, Entry, UserPrefs, AppStateBackup } from '../types';

interface FoodLogDB extends DBSchema {
  foods: {
    key: string;
    value: FoodItem;
    indexes: { 'by-category': string };
  };
  entries: {
    key: string;
    value: Entry;
    indexes: { 'by-user-date': [string, string] };
  };
  users: {
    key: string;
    value: UserPrefs;
  };
  settings: {
    key: string;
    value: any;
  };
}

class Database {
  private db: IDBPDatabase<FoodLogDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<FoodLogDB>('foodlog-km', 1, {
      upgrade(db) {
        // Foods store
        if (!db.objectStoreNames.contains('foods')) {
          const foodStore = db.createObjectStore('foods', { keyPath: 'id' });
          foodStore.createIndex('by-category', 'category');
        }

        // Entries store
        if (!db.objectStoreNames.contains('entries')) {
          const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
          entryStore.createIndex('by-user-date', ['userId', 'dateISO']);
        }

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  private ensureDB(): IDBPDatabase<FoodLogDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Foods
  async getAllFoods(): Promise<FoodItem[]> {
    const db = this.ensureDB();
    return await db.getAll('foods');
  }

  async getFood(id: string): Promise<FoodItem | undefined> {
    const db = this.ensureDB();
    return await db.get('foods', id);
  }

  async addFood(food: FoodItem): Promise<void> {
    const db = this.ensureDB();
    await db.add('foods', food);
  }

  async updateFood(food: FoodItem): Promise<void> {
    const db = this.ensureDB();
    await db.put('foods', food);
  }

  async deleteFood(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('foods', id);
  }

  async searchFoods(query: string): Promise<FoodItem[]> {
    const db = this.ensureDB();
    const allFoods = await db.getAll('foods');
    return allFoods.filter(food => 
      food.name.toLowerCase().includes(query.toLowerCase()) ||
      food.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Entries
  async getAllEntries(): Promise<Entry[]> {
    const db = this.ensureDB();
    return await db.getAll('entries');
  }

  async getEntry(id: string): Promise<Entry | undefined> {
    const db = this.ensureDB();
    return await db.get('entries', id);
  }

  async getEntriesForUser(userId: string): Promise<Entry[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('entries', 'by-user-date', IDBKeyRange.only(userId));
  }

  async getEntriesForDate(userId: string, date: string): Promise<Entry[]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('entries', 'by-user-date', IDBKeyRange.only([userId, date]));
  }

  async addEntry(entry: Entry): Promise<void> {
    const db = this.ensureDB();
    await db.add('entries', entry);
  }

  async updateEntry(entry: Entry): Promise<void> {
    const db = this.ensureDB();
    await db.put('entries', entry);
  }

  async deleteEntry(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('entries', id);
  }

  // Users
  async getAllUsers(): Promise<UserPrefs[]> {
    const db = this.ensureDB();
    return await db.getAll('users');
  }

  async updateUser(user: UserPrefs): Promise<void> {
    const db = this.ensureDB();
    await db.put('users', user);
  }

  // Settings
  async getSetting(key: string): Promise<any> {
    const db = this.ensureDB();
    const result = await db.get('settings', key);
    return result?.value;
  }

  async setSetting(key: string, value: any): Promise<void> {
    const db = this.ensureDB();
    await db.put('settings', { key, value });
  }

  // Backup
  async exportBackup(): Promise<AppStateBackup> {
    const [foods, entries, users, settings] = await Promise.all([
      this.getAllFoods(),
      this.getAllEntries(),
      this.getAllUsers(),
      this.getSetting('app_settings')
    ]);

    // Validar e limpar dados dos usuários
    const validUsers = users.filter(user => 
      user && 
      user.id && 
      user.name && 
      user.goals &&
      typeof user.goals.protein_g === 'number' &&
      typeof user.goals.carbs_g === 'number' &&
      typeof user.goals.fat_g === 'number' &&
      typeof user.goals.kcal === 'number' &&
      typeof user.goals.water_ml === 'number'
    );

    console.log(`📊 Backup: ${foods.length} alimentos, ${entries.length} entradas, ${validUsers.length} usuários válidos`);

    return {
      foods,
      entries,
      users: validUsers,
      settings: settings || { theme: 'light', language: 'pt', defaultUnit: 'g' },
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  async importBackup(backup: AppStateBackup): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(['foods', 'entries', 'users', 'settings'], 'readwrite');

    // Clear existing data
    await tx.objectStore('foods').clear();
    await tx.objectStore('entries').clear();
    await tx.objectStore('users').clear();
    await tx.objectStore('settings').clear();

    // Import new data
    for (const food of backup.foods) {
      await tx.objectStore('foods').add(food);
    }
    for (const entry of backup.entries) {
      await tx.objectStore('entries').add(entry);
    }
    for (const user of backup.users) {
      await tx.objectStore('users').add(user);
    }
    await tx.objectStore('settings').add({ key: 'app_settings', value: backup.settings });

    await tx.done;
  }

  // Função para limpar duplicações de alimentos
  async cleanDuplicateFoods(): Promise<{ removed: number; kept: number }> {
    const db = this.ensureDB();
    const allFoods = await db.getAll('foods');
    
    // Agrupa por nome e categoria para identificar duplicatas
    const foodGroups = new Map<string, FoodItem[]>();
    
    for (const food of allFoods) {
      const key = `${food.name.toLowerCase()}-${(food.category || 'sem-categoria').toLowerCase()}`;
      if (!foodGroups.has(key)) {
        foodGroups.set(key, []);
      }
      foodGroups.get(key)!.push(food);
    }
    
    let removed = 0;
    let kept = 0;
    
    // Para cada grupo, mantém apenas o primeiro item
    for (const [, foods] of foodGroups) {
      if (foods.length > 1) {
        // Mantém o primeiro, remove os demais
        const toRemove = foods.slice(1);
        
        for (const food of toRemove) {
          await db.delete('foods', food.id);
          removed++;
        }
        kept++;
      } else {
        kept++;
      }
    }
    
    console.log(`🧹 Limpeza de alimentos: ${removed} duplicatas removidas, ${kept} mantidos`);
    return { removed, kept };
  }

  // Função para limpar duplicações de entradas
  async cleanDuplicateEntries(): Promise<{ removed: number; kept: number }> {
    const db = this.ensureDB();
    const allEntries = await db.getAll('entries');
    
    // Agrupa por userId, date, foodId, qty, unit para identificar duplicatas
    const entryGroups = new Map<string, Entry[]>();
    
    for (const entry of allEntries) {
      const key = `${entry.userId}-${entry.dateISO}-${entry.foodId}-${entry.qty}-${entry.unit}`;
      if (!entryGroups.has(key)) {
        entryGroups.set(key, []);
      }
      entryGroups.get(key)!.push(entry);
    }
    
    let removed = 0;
    let kept = 0;
    
    // Para cada grupo, mantém apenas o primeiro item
    for (const [, entries] of entryGroups) {
      if (entries.length > 1) {
        // Mantém o primeiro, remove os demais
        const toRemove = entries.slice(1);
        
        for (const entry of toRemove) {
          await db.delete('entries', entry.id);
          removed++;
        }
        kept++;
      } else {
        kept++;
      }
    }
    
    console.log(`🧹 Limpeza de entradas: ${removed} duplicatas removidas, ${kept} mantidas`);
    return { removed, kept };
  }

  // Função para limpar todas as duplicações
  async cleanAllDuplicates(): Promise<{ foods: { removed: number; kept: number }; entries: { removed: number; kept: number } }> {
    console.log('🧹 Iniciando limpeza de duplicações...');
    
    const foodsResult = await this.cleanDuplicateFoods();
    const entriesResult = await this.cleanDuplicateEntries();
    
    console.log('✅ Limpeza de duplicações concluída');
    return {
      foods: foodsResult,
      entries: entriesResult
    };
  }


  // Limpar duplicatas antes de sincronizar
  async cleanDuplicatesBeforeSync(): Promise<{ foodsRemoved: number; entriesRemoved: number }> {
    console.log('🧹 Limpando duplicatas antes da sincronização...');
    
    const foodsResult = await this.cleanDuplicateFoods();
    const entriesResult = await this.cleanDuplicateEntries();
    
    console.log(`✅ Limpeza concluída: ${foodsResult.removed} alimentos e ${entriesResult.removed} entradas duplicadas removidas`);
    return { foodsRemoved: foodsResult.removed, entriesRemoved: entriesResult.removed };
  }
}

export const database = new Database();
