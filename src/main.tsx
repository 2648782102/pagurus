import React from 'react';
import { createRoot } from 'react-dom/client';
import { AgentApp } from './agent/AgentApp.js';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AgentApp />
  </React.StrictMode>,
);
