// Script para limpar dados do Firebase e reduzir uso de quota
// Execute este script no console do navegador quando estiver na aplicação

console.log('🧹 Iniciando limpeza do Firebase...');

// Função para limpar dados locais primeiro
async function clearLocalData() {
  try {
    // Limpar IndexedDB
    const deleteRequest = indexedDB.deleteDatabase('foodlog-km-db');
    
    deleteRequest.onsuccess = function() {
      console.log('✅ IndexedDB local limpo');
    };
    
    deleteRequest.onerror = function() {
      console.log('❌ Erro ao limpar IndexedDB local');
    };
    
    // Limpar localStorage
    localStorage.clear();
    console.log('✅ localStorage limpo');
    
    // Limpar sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage limpo');
    
  } catch (error) {
    console.error('❌ Erro na limpeza local:', error);
  }
}

// Função para verificar uso do Firebase
async function checkFirebaseUsage() {
  try {
    // Verificar se há dados no Firebase
    const { getFirestore, collection, getDocs, query, limit } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    const auth = getAuth();
    const db = getFirestore();
    
    if (auth.currentUser) {
      console.log('👤 Usuário autenticado:', auth.currentUser.email);
      
      // Contar documentos em cada coleção
      const foodsQuery = query(collection(db, 'foods'), limit(1));
      const entriesQuery = query(collection(db, 'entries'), limit(1));
      const usersQuery = query(collection(db, 'users'), limit(1));
      
      const [foodsSnapshot, entriesSnapshot, usersSnapshot] = await Promise.all([
        getDocs(foodsQuery),
        getDocs(entriesQuery),
        getDocs(usersQuery)
      ]);
      
      console.log('📊 Status das coleções:');
      console.log(`   Foods: ${foodsSnapshot.size > 0 ? 'Tem dados' : 'Vazia'}`);
      console.log(`   Entries: ${entriesSnapshot.size > 0 ? 'Tem dados' : 'Vazia'}`);
      console.log(`   Users: ${usersSnapshot.size > 0 ? 'Tem dados' : 'Vazia'}`);
      
    } else {
      console.log('❌ Usuário não autenticado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar Firebase:', error);
  }
}

// Função para limpar dados do Firebase (CUIDADO!)
async function clearFirebaseData() {
  try {
    const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    const auth = getAuth();
    const db = getFirestore();
    
    if (!auth.currentUser) {
      console.log('❌ Usuário não autenticado. Faça login primeiro.');
      return;
    }
    
    console.log('⚠️ ATENÇÃO: Isso vai deletar TODOS os dados do Firebase!');
    const confirm = prompt('Digite "DELETE" para confirmar a limpeza do Firebase:');
    
    if (confirm !== 'DELETE') {
      console.log('❌ Operação cancelada');
      return;
    }
    
    // Deletar todas as entradas
    const entriesQuery = collection(db, 'entries');
    const entriesSnapshot = await getDocs(entriesQuery);
    
    console.log(`🗑️ Deletando ${entriesSnapshot.size} entradas...`);
    for (const entryDoc of entriesSnapshot.docs) {
      await deleteDoc(doc(db, 'entries', entryDoc.id));
    }
    
    // Deletar todos os alimentos
    const foodsQuery = collection(db, 'foods');
    const foodsSnapshot = await getDocs(foodsQuery);
    
    console.log(`🗑️ Deletando ${foodsSnapshot.size} alimentos...`);
    for (const foodDoc of foodsSnapshot.docs) {
      await deleteDoc(doc(db, 'foods', foodDoc.id));
    }
    
    // Deletar todos os usuários
    const usersQuery = collection(db, 'users');
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`🗑️ Deletando ${usersSnapshot.size} usuários...`);
    for (const userDoc of usersSnapshot.docs) {
      await deleteDoc(doc(db, 'users', userDoc.id));
    }
    
    console.log('✅ Firebase limpo com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar Firebase:', error);
  }
}

// Executar limpeza local
clearLocalData();

// Verificar uso do Firebase
checkFirebaseUsage();

console.log('📋 Comandos disponíveis:');
console.log('   clearFirebaseData() - Limpar dados do Firebase (CUIDADO!)');
console.log('   checkFirebaseUsage() - Verificar uso atual');
console.log('   clearLocalData() - Limpar dados locais');
