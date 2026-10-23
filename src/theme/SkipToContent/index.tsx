import React, { useEffect, useRef } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import { SkipToContentFallbackId } from '@docusaurus/theme-common';
import styles from './styles.module.css';

export default function SkipToContent() {
  const location = useLocation();
  const { action } = useHistory();
  const previousLocation = useRef(location);
  const container = useRef<HTMLDivElement>(null);
  const label = translate({
    id: 'theme.common.skipToMainContent',
    message: 'Skip to main content',
    description: 'The skip to content label used for accessibility',
  });

  useEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = location;
    // Catalog filters update the URL in place; keep the active control focused.
    const catalogQueryChange =
      location.pathname === '/models' &&
      previous.pathname === location.pathname &&
      previous.hash === location.hash;
    if (
      previous !== location &&
      !catalogQueryChange &&
      !location.hash &&
      action === 'PUSH'
    ) {
      container.current?.focus();
    }
  }, [location, action]);

  return (
    <div ref={container} role="region" aria-label={label} tabIndex={-1}>
      <a
        className={styles.skipToContent}
        href={`#${SkipToContentFallbackId}`}
        onClick={(event) => {
          event.preventDefault();
          const target =
            document.querySelector<HTMLElement>('main:first-of-type') ??
            document.getElementById(SkipToContentFallbackId);
          if (target) {
            if (!target.hasAttribute('tabindex')) {
              target.setAttribute('tabindex', '-1');
              target.addEventListener(
                'blur',
                () => target.removeAttribute('tabindex'),
                { once: true },
              );
            }
            target.focus();
          }
        }}
      >
        {label}
      </a>
    </div>
  );
}
