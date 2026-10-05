import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sdkStyleVars } from './componentRendererUtils';
import { Button } from '../../ui';

describe('SDK layout styles', () => {
  it('keeps parent spacing local instead of inheriting it into controls', () => {
    const html = renderToStaticMarkup(createElement('div', {
      style: sdkStyleVars({ padding: '24px', gap: '16px' }),
    }, createElement(Button, {}, 'Save')));
    expect(html).toContain('style="padding:24px;gap:16px"');
    expect(html).not.toContain('--sdk-padding');
    expect(html).not.toContain('--sdk-gap');
  });

  it('lets React give numeric dimensions their CSS units', () => {
    const html = renderToStaticMarkup(createElement('div', {
      style: sdkStyleVars({ width: 420, height: 80, flex: 1 }),
    }));
    expect(html).toContain('width:420px');
    expect(html).toContain('height:80px');
    expect(html).toContain('flex:1');
  });
});
