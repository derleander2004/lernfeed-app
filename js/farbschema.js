// Hell-/Dunkelmodus: "auto" folgt der Handy-Einstellung, "hell" und "dunkel" erzwingen einen Modus.
// Die Wahl liegt in localStorage – das ist nur eine Bequemlichkeit; fehlt sie, gilt "auto".

const MODI = ['auto', 'hell', 'dunkel'];
const SYMBOL = { auto: '◐', hell: '☀︎', dunkel: '☾' };
const NAME = { auto: 'automatisch', hell: 'hell', dunkel: 'dunkel' };

function lese() {
  try {
    const m = localStorage.getItem('farbschema');
    return MODI.includes(m) ? m : 'auto';
  } catch {
    return 'auto';
  }
}

function speichere(modus) {
  try { localStorage.setItem('farbschema', modus); } catch { /* egal */ }
}

export function starteFarbschema(knopf) {
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  metas.forEach((m) => { m.dataset.original = m.content; });
  let modus = lese();

  function anwenden() {
    const root = document.documentElement;
    if (modus === 'auto') delete root.dataset.theme;
    else root.dataset.theme = modus === 'hell' ? 'light' : 'dark';

    knopf.textContent = SYMBOL[modus];
    knopf.setAttribute('aria-label', `Farbschema: ${NAME[modus]}. Tippen zum Wechseln.`);
    knopf.title = `Farbschema: ${NAME[modus]}`;

    // Browserleiste passend einfärben
    const farbe = getComputedStyle(root).getPropertyValue('--bg').trim();
    metas.forEach((m) => { m.content = modus === 'auto' ? m.dataset.original : farbe; });
  }

  knopf.addEventListener('click', () => {
    modus = MODI[(MODI.indexOf(modus) + 1) % MODI.length];
    speichere(modus);
    anwenden();
  });

  anwenden();
}
