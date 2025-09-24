# 🚨 Como Resolver Quota Exceeded no Firebase

## 🔍 **Passo 1: Verificar Status do Plano Blaze**

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em **"Configurações do projeto"** (ícone de engrenagem)
4. Clique em **"Faturamento"**
5. Verifique se está **"Ativo"** e vinculado ao plano Blaze

## 🔍 **Passo 2: Verificar Método de Pagamento**

1. Acesse: https://console.cloud.google.com/billing
2. Selecione sua conta de faturamento
3. Verifique se há **"Pagamentos pendentes"** ou **"Método de pagamento inválido"**
4. Se necessário, atualize o método de pagamento

## 🔍 **Passo 3: Aguardar Propagação (se upgrade foi recente)**

- O upgrade para Blaze pode levar **2-24 horas** para se propagar
- Aguarde e tente novamente

## 🔍 **Passo 4: Verificar Limites Específicos**

### **Firestore:**
- **Leituras**: 1 milhão/dia (gratuito) → Ilimitado (Blaze)
- **Escritas**: 20.000/dia (gratuito) → Ilimitado (Blaze)
- **Exclusões**: 20.000/dia (gratuito) → Ilimitado (Blaze)

### **Authentication:**
- **Usuários**: 10.000 (gratuito) → Ilimitado (Blaze)
- **Verificações**: 10.000/dia (gratuito) → Ilimitado (Blaze)

## 🔍 **Passo 5: Limpar Dados Desnecessários**

### **Opção A: Limpeza Local (Recomendado)**
1. Acesse: http://localhost:5173/foodlogkm/
2. Abra o console (F12)
3. Cole e execute o script `firebase-cleanup.js`
4. Execute: `clearLocalData()`

### **Opção B: Limpeza do Firebase (CUIDADO!)**
1. Acesse: http://localhost:5173/foodlogkm/
2. Faça login no Firebase
3. Abra o console (F12)
4. Execute: `clearFirebaseData()`
5. Digite "DELETE" para confirmar

## 🔍 **Passo 6: Verificar Uso Atual**

1. Acesse: https://console.firebase.google.com/
2. Vá em **"Uso"** no menu lateral
3. Verifique o uso de cada serviço
4. Identifique qual serviço está excedendo a quota

## 🔍 **Passo 7: Solicitar Aumento de Cota (se necessário)**

1. Acesse: https://console.cloud.google.com/iam-admin/quotas
2. Selecione seu projeto
3. Filtre por "Firebase" ou "Firestore"
4. Clique em **"Solicitar aumento"**
5. Justifique a necessidade

## 🔍 **Passo 8: Contatar Suporte Firebase**

Se nada funcionar:
1. Acesse: https://firebase.google.com/support
2. Clique em **"Contatar suporte"**
3. Descreva o problema: "Quota exceeded mesmo com plano Blaze"
4. Inclua screenshots do console de faturamento

## ⚠️ **Dicas Importantes**

### **Para Evitar Quota Exceeded no Futuro:**
1. **Use sincronização manual** (não automática)
2. **Limpe dados antigos** regularmente
3. **Monitore o uso** no console
4. **Use paginação** para grandes volumes de dados

### **Sinais de Quota Exceeded:**
- Erro: "Quota exceeded for requests"
- Erro: "Resource exhausted"
- Erro: "Too many requests"
- Aplicação não carrega dados

### **Soluções Rápidas:**
1. **Aguarde 24 horas** (alguns limites são diários)
2. **Limpe dados desnecessários**
3. **Use apenas dados locais** (IndexedDB)
4. **Sincronize manualmente** quando necessário

## 📞 **Contato de Emergência**

Se o problema persistir:
- **Email**: firebase-support@google.com
- **Chat**: https://firebase.google.com/support
- **Documentação**: https://firebase.google.com/docs/quotas
