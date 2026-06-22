import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ============================================================
//  PASSO 1: Cole aqui as credenciais do seu projeto Firebase
//  (ver README.md para instruções detalhadas)
// ============================================================
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);
