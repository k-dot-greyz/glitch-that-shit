import { describe, it, expect, beforeEach } from 'vitest';
import { Glitcher, ORIGINAL_ATTR } from '../../src/glitcher';
import { compileMatcher } from '../../src/matcher';
import { GlitchConfig, defaultConfig } from '../../src/glitch-config';
import { EFFECT_STYLE_ID } from '../../src/effects';

function setup(html: string, patch: Partial<GlitchConfig> = {}) {
  document.body.innerHTML = html;
  const config = { ...defaultConfig(), filters: ['sponsored', 'buy now'], ...patch };
  const g = new Glitcher(document);
  g.configure(config, compileMatcher(config));
  return g;
}
const spans = () => [...document.querySelectorAll<HTMLElement>('span.gts-fx')];

describe('Glitcher', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.getElementById(EFFECT_STYLE_ID)?.remove();
  });

  it('wraps matches and keeps surrounding text', () => {
    const g = setup('<p>A sponsored post. Buy now!</p>');
    expect(g.scan(document.body)).toBe(2);
    expect(spans().map((s) => s.getAttribute(ORIGINAL_ATTR))).toEqual(['sponsored', 'Buy now']);
    expect(document.querySelector('p')!.textContent).toBe('A sponsored post. Buy now!');
    expect(g.hitCount).toBe(2);
  });

  it('sets effect, intensity and tooltip attributes', () => {
    setup('<p>sponsored</p>', { effect: 'blur', intensity: 'extreme' }).scan(document.body);
    const s = spans()[0];
    expect(s.className).toBe('gts-fx gts-fx--blur');
    expect(s.dataset.gtsIntensity).toBe('extreme');
    expect(s.title).toBe('sponsored');
  });

  it('omits tooltip when showOriginalOnHover is off', () => {
    setup('<p>sponsored</p>', { showOriginalOnHover: false }).scan(document.body);
    expect(spans()[0].title).toBe('');
  });

  it('scramble replaces visible text but keeps the original', () => {
    setup('<p>sponsored</p>', { effect: 'scramble' }).scan(document.body);
    expect(spans()[0].textContent).not.toBe('sponsored');
    expect(spans()[0].getAttribute(ORIGINAL_ATTR)).toBe('sponsored');
  });

  it('skips script/style/textarea/input/contenteditable/opt-out regions', () => {
    const g = setup(`
      <script>var sponsored = 1</script><style>.sponsored{}</style>
      <textarea>sponsored</textarea><div contenteditable="true">sponsored</div>
      <div data-gts-ignore>sponsored</div><p>sponsored</p>`);
    expect(g.scan(document.body)).toBe(1);
    expect(spans()[0].parentElement!.tagName).toBe('P');
  });

  it('never re-wraps its own output (idempotent rescans)', () => {
    const g = setup('<p>sponsored sponsored</p>');
    g.scan(document.body);
    expect(g.scan(document.body)).toBe(0);
    expect(spans()).toHaveLength(2);
  });

  it('scans a single added text node', () => {
    const g = setup('<p id="p"></p>');
    const t = document.createTextNode('now sponsored');
    document.getElementById('p')!.appendChild(t);
    expect(g.scan(t)).toBe(1);
  });

  it('rescanText re-checks in-place text updates', () => {
    const g = setup('<p id="p">hello</p>');
    g.scan(document.body);
    const t = document.getElementById('p')!.firstChild as Text;
    t.data = 'hello sponsored';
    expect(g.rescanText(t)).toBe(1);
  });

  it('restore() puts the exact original text back and removes styles', () => {
    const g = setup('<p>X sponsored Y <b>buy now</b></p>', { effect: 'scramble' });
    const before = document.body.textContent;
    g.ensureStyles();
    g.scan(document.body);
    expect(document.getElementById(EFFECT_STYLE_ID)).not.toBeNull();
    g.restore();
    expect(spans()).toHaveLength(0);
    expect(document.body.textContent).toBe(before);
    expect(document.getElementById(EFFECT_STYLE_ID)).toBeNull();
    expect(g.hitCount).toBe(0);
  });

  it('ensureStyles() is idempotent', () => {
    const g = setup('');
    g.ensureStyles();
    g.ensureStyles();
    expect(document.querySelectorAll(`#${EFFECT_STYLE_ID}`)).toHaveLength(1);
  });

  it('toggleReveal swaps between original and effect text', () => {
    const g = setup('<p>sponsored</p>', { effect: 'scramble' });
    g.scan(document.body);
    const s = spans()[0];
    const hidden = s.textContent;
    expect(g.toggleReveal(s)).toBe(true);
    expect(s.textContent).toBe('sponsored');
    expect(s.hasAttribute('data-gts-revealed')).toBe(true);
    expect(g.toggleReveal(s)).toBe(false);
    expect(s.textContent).toBe(hidden);
  });

  it('glitches ad containers only when glitchAds is on, and restores them', () => {
    let g = setup('<ins class="adsbygoogle">x</ins><div data-ad-slot="1">y</div>', { filters: [] });
    g.scan(document.body);
    expect(document.querySelectorAll('.gts-ad')).toHaveLength(0);
    g = setup('<ins class="adsbygoogle">x</ins><div data-ad-slot="1">y</div>', { filters: [], glitchAds: true, effect: 'pixelate' });
    expect(g.scan(document.body)).toBe(2);
    expect(document.querySelector('.gts-ad')!.getAttribute('data-gts-effect')).toBe('pixelate');
    g.restore();
    expect(document.querySelectorAll('.gts-ad,[data-gts-effect]')).toHaveLength(0);
  });

  it('does nothing when unconfigured', () => {
    document.body.innerHTML = '<p>sponsored</p>';
    const g = new Glitcher(document);
    expect(g.active).toBe(false);
    expect(g.scan(document.body)).toBe(0);
  });

  it('never injects HTML from matched text', () => {
    const g = setup('<p>&lt;img src=x onerror=alert(1)&gt; sponsored</p>', { filters: ['<img src=x onerror=alert(1)>'], wholeWord: false });
    g.scan(document.body);
    expect(document.querySelector('img')).toBeNull();
    expect(spans()[0].textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
