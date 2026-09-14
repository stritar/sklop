import { SklopProvider } from '@sklop/react';

export function App() {
  return (
    <main className="hub-page">
      <h1>Sklop hub</h1>
      <SklopProvider scope="element">
        <p>Token page coming next.</p>
      </SklopProvider>
    </main>
  );
}
