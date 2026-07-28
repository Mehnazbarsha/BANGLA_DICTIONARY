import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase.js'
import BanglaDictionary from './BanglaDictionary'
import AuthPage from './AuthPage'
import './dictionary.css'

function Root() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  if (user === undefined) return null;
  if (!user) return <AuthPage />;
  return <BanglaDictionary />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)