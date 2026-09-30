import { createContext, useContext } from 'react';
import { lookOf, type Look } from '../draw/forms';

/* The current theme's colours, shared with everything that draws colour. Dark by default. */
const Ctx = createContext<Look>(lookOf('dark'));
export const LookProvider = Ctx.Provider;
export const useLook = () => useContext(Ctx);
