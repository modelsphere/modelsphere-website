import React, { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from '@docusaurus/router';
export default function ReadingDisclosure({
  title,
  className,
  desktopSelector,
  children,
}: {
  title: string;
  className: string;
  desktopSelector: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname && ref.current)
      ref.current.open = false;
    previousPath.current = pathname;
  }, [pathname]);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    let lastFocused: Element | null = null;
    const rememberFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target === document.body) return;
      lastFocused =
        ref.current?.contains(target) ||
        document.querySelector(desktopSelector)?.contains(target)
          ? target
          : null;
    };
    document.addEventListener('focusin', rememberFocus);
    const change = () => {
      const details = ref.current;
      if (!details) return;
      const desktop = document.querySelector<HTMLElement>(desktopSelector);
      // CSS can hide the old layout and blur it before matchMedia fires.
      const active =
        document.activeElement === document.body
          ? lastFocused
          : document.activeElement;
      if (mq.matches && details.contains(active)) {
        const href = active?.getAttribute('href');
        const target = Array.from(
          desktop?.querySelectorAll<HTMLAnchorElement>('a') ?? [],
        ).find((a) => a.getAttribute('href') === href);
        (target ?? document.querySelector<HTMLElement>('main'))?.focus({
          preventScroll: true,
        });
      } else if (!mq.matches && desktop?.contains(active)) {
        details.querySelector('summary')?.focus({ preventScroll: true });
      }
      details.open = false;
    };
    mq.addEventListener('change', change);
    return () => {
      mq.removeEventListener('change', change);
      document.removeEventListener('focusin', rememberFocus);
    };
  }, [desktopSelector]);
  return (
    <details
      ref={ref}
      className={className}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (ref.current) {
            ref.current.open = false;
            ref.current.querySelector('summary')?.focus();
          }
        }
      }}
    >
      <summary>{title}</summary>
      {children}
    </details>
  );
}
