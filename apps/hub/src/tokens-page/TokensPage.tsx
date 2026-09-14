import { type AxisProps, SklopProvider } from '@sklop/react';
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AxisToolbar, type Direction } from './AxisToolbar.js';
import { ContrastTable } from './ContrastTable.js';
import { MotionDemo } from './MotionDemo.js';
import {
  axisChoices,
  CATEGORIES,
  contrastPairs,
  type SemanticToken,
  semanticTokens,
  tokensIn,
} from './tokens.js';

const PROP_OF: Record<string, keyof AxisProps> = {
  theme: 'theme',
  preset: 'preset',
  density: 'density',
  'font-scale': 'fontScale',
  radius: 'radius',
  'motion-personality': 'motionPersonality',
  motion: 'motion',
};
const SYSTEM_QUERIES = ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)'];

/** A visual sample of the token, where its type has one. Decorative: the row names the value. */
function Specimen({ token }: { token: SemanticToken }) {
  const value = `var(${token.name})`;
  const category = token.path.split('.')[1];
  const sample = (className: string, style: CSSProperties, text?: string) => (
    <span className={`specimen ${className}`} style={style} aria-hidden="true">
      {text}
    </span>
  );
  if (token.type === 'color') return sample('specimen-swatch', { background: value });
  if (token.type === 'typography')
    return sample('specimen-type', { font: value }, 'Add photos & files');
  if (token.type === 'fontFamily') return sample('specimen-type', { fontFamily: value }, 'Figtree');
  if (token.type === 'shadow') return sample('specimen-shadow', { boxShadow: value });
  if (token.type !== 'dimension') return null;
  if (category === 'size') return sample('specimen-size', { inlineSize: value, blockSize: value });
  if (category === 'radius') return sample('specimen-radius', { borderRadius: value });
  if (category === 'border') return sample('specimen-border', { borderWidth: value });
  return sample('specimen-bar', { inlineSize: value });
}

export function TokensPage() {
  const [settings, setSettings] = useState<Record<string, string>>(() =>
    Object.fromEntries(axisChoices.map(({ axis, initial }) => [axis, initial])),
  );
  const [dir, setDir] = useState<Direction>('ltr');
  const [values, setValues] = useState<Record<string, string>>({});
  const [systemChanges, setSystemChanges] = useState(0);
  const probe = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the axes and system preferences change what the preview computes
  useLayoutEffect(() => {
    if (!probe.current) return;
    const style = getComputedStyle(probe.current);
    setValues(
      Object.fromEntries(
        semanticTokens.map((token) => [token.name, style.getPropertyValue(token.name).trim()]),
      ),
    );
  }, [settings, dir, systemChanges]);

  useEffect(() => {
    const lists = SYSTEM_QUERIES.map((query) => window.matchMedia(query));
    const onChange = () => setSystemChanges((n) => n + 1);
    for (const list of lists) list.addEventListener('change', onChange);
    return () => {
      for (const list of lists) list.removeEventListener('change', onChange);
    };
  }, []);

  const axisProps = Object.fromEntries(
    Object.entries(settings).map(([axis, value]) => [PROP_OF[axis], value]),
  ) as AxisProps;

  return (
    <>
      <header className="hub-header">
        <h1>Tokens</h1>
        <p>
          Every semantic token in @sklop/tokens and the value it computes in the preview. Change any
          axis to see it live.
        </p>
        <AxisToolbar
          settings={settings}
          dir={dir}
          onAxis={(axis, value) => setSettings((previous) => ({ ...previous, [axis]: value }))}
          onDir={setDir}
        />
      </header>
      <main>
        <SklopProvider scope="element" dir={dir} className="preview" {...axisProps}>
          <div ref={probe} className="preview-body" data-testid="preview">
            {CATEGORIES.map(([category, label]) => (
              <section
                key={category}
                className="preview-section"
                aria-labelledby={`${category}-heading`}
              >
                <h2 id={`${category}-heading`}>{label}</h2>
                <ul className="token-list">
                  {tokensIn(category).map((token) => (
                    <li
                      key={token.name}
                      className="token"
                      data-token={token.name}
                      title={token.description}
                    >
                      <Specimen token={token} />
                      <code className="token-name">{token.name}</code>
                      <span className="token-value" data-value="">
                        {values[token.name]}
                      </span>
                      <span className="token-origin">
                        {token.approved
                          ? `${token.origin}, approved ${token.approved}`
                          : token.origin}
                      </span>
                    </li>
                  ))}
                </ul>
                {category === 'motion' ? <MotionDemo /> : null}
              </section>
            ))}
            <section className="preview-section" aria-labelledby="contrast-heading">
              <h2 id="contrast-heading">Contrast</h2>
              <ContrastTable pairs={contrastPairs} values={values} />
            </section>
          </div>
        </SklopProvider>
      </main>
    </>
  );
}
