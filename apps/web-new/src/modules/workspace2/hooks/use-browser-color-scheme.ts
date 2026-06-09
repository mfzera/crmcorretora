import { useEffect, useState } from 'react';
import type { ColorSchemeValue } from 'ag-grid-community';

export function useBrowserColorScheme(): ColorSchemeValue {
  const [scheme, setScheme] = useState<ColorSchemeValue>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setScheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return scheme;
}
