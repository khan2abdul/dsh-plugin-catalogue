import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/dsh/base.css';
import './styles/dsh/design-platform.css';
import './styles/dsh/scrollbar.css';
import './styles/dsh/focus.css';
import './styles/site.css';
import './styles/site-plain.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
