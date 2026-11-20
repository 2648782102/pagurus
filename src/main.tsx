import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { resolveSurfaceFromLocation } from './shared/ui/surface.js';
import { AgentApp } from './agent/AgentApp.js';
import './styles.css';

const surface = resolveSurfaceFromLocation(window.location.search, window.location.hash);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {surface === 'agent' ? <AgentApp /> : <App />}
  </React.StrictMode>,
);
