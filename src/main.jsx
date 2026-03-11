import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BanglaDictionary from './BanglaDictionary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BanglaDictionary />
  </StrictMode>
)