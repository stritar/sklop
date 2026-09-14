import {
  AXIS_NAMES,
  type AxisProps,
  absentValue,
  acceptedValues,
  axes,
  fromProps,
} from './axes.js';

export interface SklopScriptProps extends AxisProps {
  /** The key the root SklopProvider persists choices under. */
  persistKey?: string | undefined;
  /** Nonce for a Content Security Policy that restricts inline scripts. */
  nonce?: string | undefined;
}

/**
 * The inline script's source. Before first paint it sets every axis attribute on `<html>` from stored
 * choices, falling back to the defaults, so a persisted dark theme never flashes light.
 */
export function noFlashScript({
  persistKey,
  nonce: _nonce,
  ...axisProps
}: SklopScriptProps): string {
  const defaults = fromProps(axisProps);
  const config = {
    key: persistKey ?? null,
    axes: Object.fromEntries(
      AXIS_NAMES.map((axis) => [
        axis,
        [axes[axis].attribute, acceptedValues(axis), defaults[axis] ?? absentValue(axis)],
      ]),
    ),
  };
  // `<` is escaped so no value can close the script element.
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return `(function(c){var s={};if(c.key){try{s=JSON.parse(localStorage.getItem(c.key)||"{}")||{}}catch(e){}}var h=document.documentElement;for(var a in c.axes){var x=c.axes[a];h.setAttribute(x[0],x[1].indexOf(s[a])>-1?s[a]:x[2])}})(${json})`;
}

/** Render in `<head>`, with the same axis props and `persistKey` as the root SklopProvider. */
export function SklopScript(props: SklopScriptProps) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: the script must run inline before first paint; its source is generated here and escaped
    <script nonce={props.nonce} dangerouslySetInnerHTML={{ __html: noFlashScript(props) }} />
  );
}
