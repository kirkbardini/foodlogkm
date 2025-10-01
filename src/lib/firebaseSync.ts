import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  getDocs,
  orderBy,
  deleteDoc,
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { FoodItem, Entry, UserPrefs, CalorieExpenditure } from '../types';

class FirebaseSyncService {
  private unsubscribe: (() => void) | null = null;

  async signInWithGoogle(): Promise<boolean> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Verificar se o email está autorizado
      const email = result.user.email;
      if (email === 'bardini.kirk@gmail.com' || email === 'emanuelle.joaquim@gmail.com') {
        console.log('✅ Login realizado com sucesso:', result.user.displayName);
        return true;
      } else {
        console.log('❌ Email não autorizado:', email);
        await this.signOut();
        return false;
      }
    } catch (error) {
      console.error('Erro no login Google:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Foods
  async saveFood(food: FoodItem): Promise<void> {
    // Salvando alimento (LOCAL → FIREBASE)
    const now = Date.now();
    
    // Filtrar valores undefined antes de enviar para o Firebase
    const foodData: any = {
      id: food.id,
      name: food.name,
      category: food.category,
      per: typeof food.per === 'string' ? parseFloat(food.per) || 100 : food.per,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      kcal: food.kcal,
      updatedAt: now,
      createdAt: food.createdAt || now
    };

    // Adicionar campos opcionais apenas se não forem undefined
    if (food.density_g_per_ml !== undefined) {
      foodData.density_g_per_ml = food.density_g_per_ml;
    }

    await setDoc(doc(db, 'foods', food.id), foodData);
  }

  async saveFoods(foods: FoodItem[]): Promise<void> {
    console.log(`🍎 Salvando ${foods.length} alimentos (LOCAL → FIREBASE)...`);
    
    // Primeiro, carregar todos os alimentos existentes do Firebase
    const existingFoods = await this.loadFoods();
    const existingFoodIds = new Set(existingFoods.map(f => f.id));
    const existingFoodNames = new Set(existingFoods.map(f => f.name.toLowerCase()));
    
    let newCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    
    for (const food of foods) {
      // Validações de segurança
      if (!food || !food.id || !food.name) {
        console.warn('⚠️ Alimento inválido ignorado:', food);
        skipCount++;
        continue;
      }
      
      // Verificar se já existe pelo ID
      if (existingFoodIds.has(food.id)) {
        await this.saveFood(food);
        updateCount++;
        continue;
      }
      
      // Verificar se já existe pelo nome (case insensitive)
      if (existingFoodNames.has(food.name.toLowerCase())) {
        skipCount++;
        continue;
      }
      
      // Novo alimento
      await this.saveFood(food);
      newCount++;
      
      // Adicionar às listas de controle
      existingFoodIds.add(food.id);
      existingFoodNames.add(food.name.toLowerCase());
    }
    
    console.log(`✅ Alimentos sincronizados: ${newCount} novos, ${updateCount} atualizados, ${skipCount} duplicados ignorados`);
  }

  // Contar alimentos no Firebase (query rápida)
  async countFoods(): Promise<number> {
    const foodsQuery = query(collection(db, 'foods'));
    const snapshot = await getDocs(foodsQuery);
    return snapshot.docs.length;
  }

  // Contar entradas no Firebase (query rápida)
  async countEntries(): Promise<number> {
    const entriesQuery = query(collection(db, 'entries'));
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.length;
  }

  // Verificar se dados locais estão sincronizados
  async checkSyncStatus(localFoodsCount: number, localEntriesCount: number): Promise<{ 
    needsSync: boolean; 
    reason: string; 
    needsFoods: boolean; 
    needsEntries: boolean 
  }> {
    try {
      const [firebaseFoodsCount, firebaseEntriesCount] = await Promise.all([
        this.countFoods(),
        this.countEntries()
      ]);

      console.log(`📊 Verificação de sincronização:`);
      console.log(`   Local: ${localFoodsCount} alimentos, ${localEntriesCount} entradas`);
      console.log(`   Firebase: ${firebaseFoodsCount} alimentos, ${firebaseEntriesCount} entradas`);

      const needsFoods = localFoodsCount !== firebaseFoodsCount;
      const needsEntries = localEntriesCount !== firebaseEntriesCount;
      const needsSync = needsFoods || needsEntries;

      let reason = '';
      if (needsFoods && needsEntries) {
        reason = `Alimentos: ${localFoodsCount} vs ${firebaseFoodsCount}, Entradas: ${localEntriesCount} vs ${firebaseEntriesCount}`;
      } else if (needsFoods) {
        reason = `Alimentos: local ${localFoodsCount} vs Firebase ${firebaseFoodsCount}`;
      } else if (needsEntries) {
        reason = `Entradas: local ${localEntriesCount} vs Firebase ${firebaseEntriesCount}`;
      } else {
        reason = 'Dados sincronizados';
      }

      return { 
        needsSync, 
        reason, 
        needsFoods, 
        needsEntries 
      };
    } catch (error) {
      console.warn('⚠️ Erro ao verificar sincronização:', error);
      return { 
        needsSync: true, 
        reason: 'Erro na verificação',
        needsFoods: true,
        needsEntries: true
      };
    }
  }

  // Carregar dados seletivamente baseado no que precisa ser sincronizado
  async loadSelectiveData(needsFoods: boolean, needsEntries: boolean, needsCalorieExpenditure: boolean, userId: string): Promise<{ foods: FoodItem[]; entries: Entry[]; calorieExpenditure: CalorieExpenditure[] }> {
    const results = { foods: [] as FoodItem[], entries: [] as Entry[], calorieExpenditure: [] as CalorieExpenditure[] };
    
    if (needsFoods) {
      console.log('🍎 Carregando alimentos do Firebase...');
      results.foods = await this.loadFoods();
    } else {
      console.log('✅ Alimentos já sincronizados - usando dados locais');
    }
    
    if (needsEntries) {
      console.log('📝 Carregando entradas do Firebase...');
      results.entries = await this.loadEntries(userId);
    } else {
      console.log('✅ Entradas já sincronizadas - usando dados locais');
    }
    
    if (needsCalorieExpenditure) {
      console.log('🔥 Carregando calorie expenditure do Firebase...');
      results.calorieExpenditure = await this.loadCalorieExpenditureForUser(userId);
    } else {
      console.log('✅ Calorie expenditure já sincronizado - usando dados locais');
    }
    
    return results;
  }

  async loadFoods(): Promise<FoodItem[]> {
    const foodsQuery = query(collection(db, 'foods'), orderBy('name'));
    const snapshot = await getDocs(foodsQuery);
    
    // Carregando alimentos (FIREBASE)
    
    const foods = snapshot.docs.map(doc => {
      const data = doc.data();
      const food = {
        id: data.id,
        name: data.name,
        category: data.category,
        per: typeof data.per === 'string' ? parseFloat(data.per) || 100 : data.per || 100,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        kcal: data.kcal || 0,
        density_g_per_ml: data.density_g_per_ml,
        updatedAt: data.updatedAt || Date.now(),
        createdAt: data.createdAt || Date.now()
      } as FoodItem;
      
      return food;
    });
    
    // Alimentos carregados (FIREBASE)
    return foods;
  }

  async deleteFood(id: string): Promise<void> {
    await deleteDoc(doc(db, 'foods', id));
    // Alimento deletado (FIREBASE)
  }

  // Entries
  async saveEntry(entry: Entry): Promise<void> {
    // Salvando entrada (LOCAL → FIREBASE)
    // Filtrar valores undefined antes de enviar para o Firebase
    const entryData: any = {
      id: entry.id,
      userId: entry.userId,
      dateISO: entry.dateISO,
      foodId: entry.foodId,
      qty: entry.qty,
      unit: entry.unit,
      mealType: entry.mealType,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      kcal: entry.kcal,
      water_ml: entry.water_ml || 0, // Garantir que water_ml nunca seja undefined
      updatedAt: serverTimestamp()
    };

    // Adicionar campos opcionais apenas se não forem undefined
    if (entry.note !== undefined) {
      entryData.note = entry.note;
    }

    await setDoc(doc(db, 'entries', entry.id), entryData);
  }

  async saveEntries(entries: Entry[]): Promise<void> {
    console.log(`📝 Salvando ${entries.length} entradas (LOCAL → FIREBASE)...`);
    
    // Primeiro, carregar todas as entradas existentes do Firebase
    const existingEntries = await this.loadAllEntries();
    const existingEntryIds = new Set(existingEntries.map(e => e.id));
    
    let newCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    
    for (const entry of entries) {
      // Validações de segurança
      if (!entry || !entry.id || !entry.userId || !entry.foodId) {
        console.warn('⚠️ Entrada inválida ignorada:', entry);
        skipCount++;
        continue;
      }
      
      // Verificar se já existe pelo ID
      if (existingEntryIds.has(entry.id)) {
        await this.saveEntry(entry);
        updateCount++;
        continue;
      }
      
      // Nova entrada
      await this.saveEntry(entry);
      newCount++;
      
      // Adicionar ao controle
      existingEntryIds.add(entry.id);
    }
    
    console.log(`✅ Entradas sincronizadas: ${newCount} novas, ${updateCount} atualizadas, ${skipCount} inválidas ignoradas`);
  }

  async loadEntries(userId: string): Promise<Entry[]> {
    const entriesQuery = query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      orderBy('dateISO', 'desc')
    );
    const snapshot = await getDocs(entriesQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        userId: data.userId,
        dateISO: data.dateISO,
        foodId: data.foodId,
        qty: data.qty,
        unit: data.unit,
        mealType: data.mealType,
        note: data.note,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        kcal: data.kcal,
        water_ml: data.water_ml
      } as Entry;
    });
  }

  async loadAllEntries(): Promise<Entry[]> {
    const entriesQuery = query(collection(db, 'entries'), orderBy('dateISO', 'desc'));
    const snapshot = await getDocs(entriesQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        userId: data.userId,
        dateISO: data.dateISO,
        foodId: data.foodId,
        qty: data.qty,
        unit: data.unit,
        mealType: data.mealType,
        note: data.note,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        kcal: data.kcal,
        water_ml: data.water_ml
      } as Entry;
    });
  }

  async deleteEntry(id: string): Promise<void> {
    await deleteDoc(doc(db, 'entries', id));
    console.log(`🗑️ Entrada deletada: ${id}`);
  }

  // Calorie Expenditure
  async saveCalorieExpenditure(calorieExpenditure: CalorieExpenditure): Promise<void> {
    const now = Date.now();
    
    const calorieExpenditureData: any = {
      id: calorieExpenditure.id,
      userId: calorieExpenditure.userId,
      dateISO: calorieExpenditure.dateISO,
      calories_burned: calorieExpenditure.calories_burned,
      source: calorieExpenditure.source,
      updatedAt: now,
      createdAt: calorieExpenditure.createdAt || now
    };

    // Adicionar campos opcionais apenas se não forem undefined
    if (calorieExpenditure.note !== undefined) {
      calorieExpenditureData.note = calorieExpenditure.note;
    }

    await setDoc(doc(db, 'calorieExpenditure', calorieExpenditure.id), calorieExpenditureData);
  }

  async loadCalorieExpenditure(): Promise<CalorieExpenditure[]> {
    const q = query(collection(db, 'calorieExpenditure'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const calorieExpenditure: CalorieExpenditure[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      calorieExpenditure.push({
        id: data.id,
        userId: data.userId,
        dateISO: data.dateISO,
        calories_burned: data.calories_burned,
        source: data.source,
        note: data.note,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    
    return calorieExpenditure;
  }

  async loadCalorieExpenditureForUser(userId: string): Promise<CalorieExpenditure[]> {
    const q = query(
      collection(db, 'calorieExpenditure'), 
      where('userId', '==', userId),
      orderBy('dateISO', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const calorieExpenditure: CalorieExpenditure[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      calorieExpenditure.push({
        id: data.id,
        userId: data.userId,
        dateISO: data.dateISO,
        calories_burned: data.calories_burned,
        source: data.source,
        note: data.note,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    
    return calorieExpenditure;
  }

  async deleteCalorieExpenditure(id: string): Promise<void> {
    await deleteDoc(doc(db, 'calorieExpenditure', id));
    console.log(`🗑️ Calorie expenditure deletado: ${id}`);
  }

  // Users
  async saveUsers(users: UserPrefs[]): Promise<void> {
    console.log('👥 Salvando usuários (LOCAL → FIREBASE):', users);
    
    // Primeiro, carregar todos os usuários existentes do Firebase
    const existingUsers = await this.loadUsers();
    const existingUserIds = new Set(existingUsers.map(u => u.id));
    
    let newCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    
    for (const user of users) {
      // Validações de segurança
      if (!user || !user.id || !user.name) {
        console.warn('⚠️ Usuário inválido ignorado:', user);
        skipCount++;
        continue;
      }

      // Garantir que todos os campos existam
      const userData = {
        id: user.id,
        name: user.name || 'Usuário',
        goals: {
          protein_g: user.goals?.protein_g || 0,
          carbs_g: user.goals?.carbs_g || 0,
          fat_g: user.goals?.fat_g || 0,
          kcal: user.goals?.kcal || 0,
          water_ml: user.goals?.water_ml || 0
        },
        updatedAt: serverTimestamp()
      };
      
      if (existingUserIds.has(user.id)) {
        updateCount++;
      } else {
        newCount++;
      }
      
      await setDoc(doc(db, 'users', user.id), userData);
    }
    
    console.log(`✅ Usuários sincronizados: ${newCount} novos, ${updateCount} atualizados, ${skipCount} inválidos ignorados`);
  }

  async loadUsers(): Promise<UserPrefs[]> {
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        name: data.name,
        goals: {
          protein_g: data.goals?.protein_g || 0,
          carbs_g: data.goals?.carbs_g || 0,
          fat_g: data.goals?.fat_g || 0,
          kcal: data.goals?.kcal || 0,
          water_ml: data.goals?.water_ml || 0
        },
        weeklyGoalFactor: data.weeklyGoalFactor || 1.0
      } as UserPrefs;
    });
  }

  onUsersChange(callback: (users: UserPrefs[]) => void): () => void {
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users: UserPrefs[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: data.id,
          name: data.name,
          goals: {
            protein_g: data.goals?.protein_g || 0,
            carbs_g: data.goals?.carbs_g || 0,
            fat_g: data.goals?.fat_g || 0,
            kcal: data.goals?.kcal || 0,
            water_ml: data.goals?.water_ml || 0
          }
        });
      });
      callback(users);
    });
    return unsubscribe;
  }

  onFoodsChange(callback: (foods: FoodItem[]) => void): () => void {
    const foodsQuery = query(collection(db, 'foods'), orderBy('name'));
    const unsubscribe = onSnapshot(foodsQuery, (snapshot) => {
      const foods: FoodItem[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        foods.push({
          id: data.id,
          name: data.name,
          category: data.category,
          per: data.per || 100,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fat_g: data.fat_g || 0,
          kcal: data.kcal || 0,
          density_g_per_ml: data.density_g_per_ml,
          updatedAt: data.updatedAt || Date.now(),
          createdAt: data.createdAt || Date.now()
        } as FoodItem);
      });
      callback(foods);
    });
    return unsubscribe;
  }

  // Load all data
  async loadAllUsersData(): Promise<{ entries: Entry[]; foods: FoodItem[]; users: UserPrefs[]; calorieExpenditure: CalorieExpenditure[] }> {
    const [entries, foods, users, calorieExpenditure] = await Promise.all([
      this.loadAllEntries(),
      this.loadFoods(),
      this.loadUsers(),
      this.loadCalorieExpenditure()
    ]);

    return { entries, foods, users, calorieExpenditure };
  }

  getUserIdFromEmail(email: string): string {
    if (email === 'bardini.kirk@gmail.com') return 'kirk';
    if (email === 'emanuelle.joaquim@gmail.com') return 'manu';
    return 'kirk'; // fallback
  }

  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    if (!user?.email) return 'kirk';
    return this.getUserIdFromEmail(user.email);
  }
}

export const firebaseSyncService = new FirebaseSyncService();
