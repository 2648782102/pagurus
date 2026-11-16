import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { resolveSurface } from './app/surface.js';
import { AgentApp } from './agent/AgentApp.js';
import './styles.css';

const surface = resolveSurface(window.location.search);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {surface === 'agent' ? <AgentApp /> : <App />}
  </React.StrictMode>,
);
