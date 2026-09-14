import { useState } from 'react';

/** Replayable role demos, so durations, easings, travel and scale can be judged moving. */
export function MotionDemo() {
  const [entered, setEntered] = useState(0);
  const [exited, setExited] = useState(0);
  return (
    <div className="motion-demos">
      <figure className="motion-demo">
        <div key={`enter-${entered}`} className="motion-box" data-demo="enter">
          Enter
        </div>
        <figcaption>
          <button type="button" className="demo-button" onClick={() => setEntered((n) => n + 1)}>
            Replay enter
          </button>
        </figcaption>
      </figure>
      <figure className="motion-demo">
        <div key={`exit-${exited}`} className="motion-box" data-demo={exited ? 'exit' : 'rest'}>
          Exit
        </div>
        <figcaption>
          <button type="button" className="demo-button" onClick={() => setExited((n) => n + 1)}>
            Replay exit
          </button>
        </figcaption>
      </figure>
      <figure className="motion-demo">
        <button type="button" className="motion-box" data-demo="press">
          Press and hold
        </button>
        <figcaption>Press slower than release</figcaption>
      </figure>
      <figure className="motion-demo">
        <button type="button" className="motion-box" data-demo="hover">
          Hover me
        </button>
        <figcaption>Colour transition on hover</figcaption>
      </figure>
    </div>
  );
}
