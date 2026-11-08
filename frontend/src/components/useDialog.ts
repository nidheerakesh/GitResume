import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Focus moves into the dialog on open, Tab stays inside it, Escape closes it,
// and focus goes back to the trigger on close.
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    const focusables = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('disabled')) : [];

    (focusables()[0] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, []);

  return ref;
}
