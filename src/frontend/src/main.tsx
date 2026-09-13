import { createRoot } from 'react-dom/client'
import App from './app/App'
import '../marketplace-themes.css'
import './app/dashboard.css'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)
