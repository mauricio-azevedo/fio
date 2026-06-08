import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
  it('renders the Fio product promise', () => {
    const html = renderToString(<App />);

    expect(html).toContain('Keep important relationships from fading by inertia.');
    expect(html).toContain('private relationship-care app');
  });
});
