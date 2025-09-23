# FoodLog KM

Aplicação web para registro de alimentos e nutrientes, desenvolvida para Kirk e Manu.

## 🚀 Demo

Acesse a aplicação em: [https://kirkbardini.github.io/foodlogkm/](https://kirkbardini.github.io/foodlogkm/)

## ✨ Funcionalidades

- 📱 **Interface responsiva** - Funciona em desktop e mobile
- 👥 **Multi-usuário** - Perfis separados para Kirk e Manu
- 🍎 **Base de alimentos** - Gerenciamento completo de alimentos
- 📊 **Relatórios** - Relatórios diários, semanais e mensais
- 💧 **Controle de água** - Acompanhamento de hidratação
- ☁️ **Sincronização Firebase** - Dados sincronizados na nuvem
- 📱 **PWA** - Instalável como app nativo
- 🔄 **Offline** - Funciona sem internet

## 🛠️ Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Zustand** - Gerenciamento de estado
- **IndexedDB** - Armazenamento local
- **Firebase** - Sincronização em nuvem
- **PWA** - Aplicação progressiva

## 🚀 Como executar localmente

1. Clone o repositório:
```bash
git clone https://github.com/kirkbardini/foodlogkm.git
cd foodlogkm
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Firebase
```

4. Execute em modo de desenvolvimento:
```bash
npm run dev
```

5. Acesse: http://localhost:5173

## 📦 Build para produção

```bash
npm run build
```

## 🧪 Testes

```bash
npm run test
```

## 📱 PWA

A aplicação é uma PWA (Progressive Web App) e pode ser instalada no dispositivo:

1. Acesse a aplicação no navegador
2. Clique no ícone de instalação na barra de endereços
3. Siga as instruções para instalar

## 🔧 Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication (Google) e Firestore
3. Copie as credenciais para o arquivo `.env`
4. Configure as regras de segurança do Firestore

## 📄 Licença

Este projeto é privado e desenvolvido para uso pessoal.
