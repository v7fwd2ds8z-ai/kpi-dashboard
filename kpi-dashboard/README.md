# Painel de KPIs Estratégicos

React app com login Google e sincronização em tempo real via Firebase.

---

## Como colocar no ar (sem precisar de terminal)

### Passo 1 — Criar o projeto no Firebase (gratuito)

1. Acesse https://console.firebase.google.com
2. Clique em **"Criar um projeto"** → dê um nome (ex: `meus-kpis`) → avance até criar
3. No menu lateral, clique em **Authentication** → **Primeiros passos** → ative o provedor **Google**
4. No menu lateral, clique em **Realtime Database** → **Criar banco de dados** → escolha **Iniciar em modo de teste** → selecione a região mais próxima (us-central1) → confirmar
5. No menu lateral, clique na engrenagem ⚙️ → **Configurações do projeto** → role até **"Seus apps"** → clique em **`</>`** (Web)
6. Dê um apelido ao app → clique **Registrar app**
7. O Firebase vai mostrar um bloco de código com `firebaseConfig`. **Copie esse bloco** — você vai precisar no passo 3.

---

### Passo 2 — Subir o código no GitHub

1. Acesse https://github.com e crie uma conta se ainda não tiver
2. Clique em **"New repository"** → nome: `kpi-dashboard` → **Create repository**
3. Arraste a pasta `kpi-dashboard` (este projeto) para a tela do GitHub → ele vai fazer o upload automaticamente

---

### Passo 3 — Colar suas credenciais Firebase

No GitHub, abra o arquivo `src/lib/firebase.js` e clique no ícone de lápis (editar).

Substitua os valores `"COLE_AQUI"` pelos valores que você copiou no passo 1. Ficará assim:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "meus-kpis.firebaseapp.com",
  databaseURL: "https://meus-kpis-default-rtdb.firebaseio.com",
  projectId: "meus-kpis",
  storageBucket: "meus-kpis.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

Clique em **Commit changes** para salvar.

---

### Passo 4 — Deploy na Vercel (link público)

1. Acesse https://vercel.com e entre com sua conta GitHub
2. Clique em **"Add New Project"** → selecione o repositório `kpi-dashboard`
3. Clique em **Deploy** — aguarde ~2 minutos
4. Pronto! A Vercel vai gerar um link tipo `kpi-dashboard-seunome.vercel.app`

---

### Passo 5 — Autorizar o domínio no Firebase

1. Volte ao Firebase Console → **Authentication** → aba **Settings** → **Domínios autorizados**
2. Clique em **Adicionar domínio** → cole o link da Vercel (ex: `kpi-dashboard-seunome.vercel.app`)
3. Salve. Agora o login com Google vai funcionar no seu link público.

---

## Como usar com sócios

- Cada sócio acessa o link da Vercel e faz login com Google
- Na barra roxa no topo, há um **código do espaço** (padrão: `minha-empresa`)
- Todos que usarem o mesmo código veem e editam os mesmos dados em tempo real
- Você pode criar espaços separados por departamento mudando o código

---

## Estrutura do projeto

```
kpi-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── firebase.js    ← suas credenciais ficam aqui
│   ├── App.js             ← toda a lógica e interface
│   └── index.js
├── package.json
├── vercel.json
└── README.md
```
