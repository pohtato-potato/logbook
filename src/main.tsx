import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/atkinson-hyperlegible/400-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import { App } from './App';
import { consumeShare } from './share';
import { handleAuthReturn } from './sources/google';
import { initPwa } from './pwa';
if (!handleAuthReturn()) consumeShare();
import './styles/tokens.css';
import './styles/app.css';
import './styles/app-2a.css';
import './styles/app-2c.css';
import './styles/app-3a.css';
import './styles/app-desk.css';
import './styles/app-3b.css';
import './styles/app-extra.css';

// Ask the browser not to clear Logbook's storage under pressure. It's fine if it says no.
if (navigator.storage && navigator.storage.persist) void navigator.storage.persist();

void initPwa();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
