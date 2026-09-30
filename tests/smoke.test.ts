import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { App } from '../src/App';

describe('app shell', () => {
  it('renders', () => {
    expect(renderToStaticMarkup(createElement(App))).toContain('app-root');
  });
});
