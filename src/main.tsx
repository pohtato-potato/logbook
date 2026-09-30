import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/atkinson-hyperlegible/400-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import { App } from './App';

// Ask the browser not to clear Logbook's storage under pressure. It's fine if it says no.
if (navigator.storage && navigator.storage.persist) void navigator.storage.persist();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
