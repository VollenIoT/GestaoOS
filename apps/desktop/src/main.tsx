import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DialogProvider } from './components/DialogContext';
import './index.css';

// Desabilita o menu de contexto padrão do navegador nativo/WebView
window.addEventListener('contextmenu', (e: MouseEvent) => {
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <DialogProvider>
        <App />
      </DialogProvider>
    </ErrorBoundary>
);


