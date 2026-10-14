import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistence } from './features/backup/storage';
import { useApp } from './store/appStore';
import { setupPwa } from './ui/pwa';
import './styles.css';

setupPwa();
void useApp.getState().init();
// Ask early: on iOS this is typically granted for Home Screen apps.
void requestPersistence();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
