import { contrastRatio } from './contrast.js';
import type { ContrastPair } from './tokens.js';

export type ContrastResult = 'Passes' | 'Fails' | 'Exempt' | 'Not measured';

export function resultOf(pair: ContrastPair, ratio: number | null): ContrastResult {
  if (pair.exempt) return 'Exempt';
  if (ratio === null || pair.min === undefined) return 'Not measured';
  return ratio >= pair.min ? 'Passes' : 'Fails';
}

/** Documented pairs measured against the values the preview computes right now. */
export function ContrastTable({
  pairs,
  values,
}: {
  pairs: ContrastPair[];
  values: Record<string, string>;
}) {
  const rows = pairs.map((pair) => {
    const ratio = contrastRatio(values[pair.foreground], values[pair.background]);
    return { pair, ratio, result: resultOf(pair, ratio) };
  });
  const failing = rows.filter((row) => row.result === 'Fails').length;
  return (
    <div className="contrast-table-wrap">
      <table className="contrast-table">
        <caption>
          {rows.length} documented pairs, {failing === 0 ? 'none failing' : `${failing} failing`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Foreground</th>
            <th scope="col">Background</th>
            <th scope="col">Ratio</th>
            <th scope="col">Needs</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ pair, ratio, result }) => (
            <tr key={`${pair.foreground} ${pair.background}`} data-result={result}>
              <td>
                <code>{pair.foreground}</code>
              </td>
              <td>
                <code>{pair.background}</code>
              </td>
              <td>{ratio === null ? '' : `${ratio.toFixed(2)}:1`}</td>
              <td>{pair.exempt ?? `${pair.min}:1`}</td>
              <td>{result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
