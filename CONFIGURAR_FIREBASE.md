# 🔥 Configuração Completa do Firebase

## 📋 **Passo 1: Criar Projeto Firebase**

1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `foodlog-km` (ou qualquer nome)
4. **Desabilite** Google Analytics (não é necessário)
5. Clique em **"Criar projeto"**

## 📋 **Passo 2: Configurar Firestore Database**

1. No console do Firebase, vá em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. **Escolha "Test mode"** (para desenvolvimento)
4. **Localização**: escolha a mais próxima (us-central, us-east, etc.)
5. Clique em **"Próximo"**

## 📋 **Passo 3: Configurar Regras de Segurança**

1. Vá em **"Firestore Database"** → **"Regras"**
2. **Substitua** as regras existentes por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para alimentos (públicos para todos os usuários)
    match /foods/{foodId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para entradas (usuários podem editar qualquer entrada)
    match /entries/{entryId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para usuários (cada usuário pode editar seus próprios dados)
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Clique em **"Publicar"**

## 📋 **Passo 4: Configurar Authentication**

1. Vá em **"Authentication"** → **"Sign-in method"**
2. **Habilite "Google"**
3. **Projeto de suporte**: escolha o mesmo projeto
4. **Emails autorizados**: adicione:
   - `bardini.kirk@gmail.com`
   - `emanuelle.joaquim@gmail.com`
5. Clique em **"Salvar"**

## 📋 **Passo 5: Obter Credenciais**

1. Vá em **"Configurações do projeto"** (ícone de engrenagem)
2. Role para baixo até **"Seus aplicativos"**
3. Clique em **"Adicionar aplicativo"** → **"Web"**
4. Nome: `FoodLog KM`
5. **NÃO** marque "Configurar Firebase Hosting"
6. Clique em **"Registrar aplicativo"**
7. **Copie as credenciais** que aparecem

## 📋 **Passo 6: Configurar Variáveis de Ambiente**

1. Abra o arquivo `.env` no projeto
2. **Cole as credenciais** do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

## 📋 **Passo 7: Configurar GitHub Secrets (para produção)**

1. No GitHub, vá em **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. **Adicione cada variável**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## 📋 **Passo 8: Testar Configuração**

1. **Reinicie o servidor** de desenvolvimento
2. Acesse: http://localhost:5173/foodlogkm/
3. **Teste o login** com Google
4. **Verifique** se os dados são salvos no Firestore

## 📋 **Passo 9: Mudar para Produção (quando estiver funcionando)**

1. No Firestore, vá em **"Regras"**
2. **Substitua** por regras mais restritivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Apenas usuários autorizados
    match /foods/{foodId} {
      allow read, write: if request.auth != null 
        && request.auth.token.email in [
          'bardini.kirk@gmail.com',
          'emanuelle.joaquim@gmail.com'
        ];
    }
    
    match /entries/{entryId} {
      allow read, write: if request.auth != null 
        && request.auth.token.email in [
          'bardini.kirk@gmail.com',
          'emanuelle.joaquim@gmail.com'
        ];
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.token.email in [
          'bardini.kirk@gmail.com',
          'emanuelle.joaquim@gmail.com'
        ];
    }
  }
}
```

## ⚠️ **Dicas Importantes**

### **Para Desenvolvimento:**
- Use **"Test mode"** no Firestore
- Use regras **permissivas** (como as do Passo 3)
- **Teste tudo** antes de ir para produção

### **Para Produção:**
- Use regras **restritivas** (como as do Passo 9)
- **Monitore o uso** no console
- **Configure alertas** de quota

### **Problemas Comuns:**
- **"Permission denied"**: verifique as regras
- **"Quota exceeded"**: monitore o uso
- **"Auth failed"**: verifique os emails autorizados

## 📞 **Suporte**

Se tiver problemas:
1. **Verifique o console** do navegador (F12)
2. **Verifique o console** do Firebase
3. **Teste as regras** no simulador do Firebase
4. **Contate o suporte** se necessário
