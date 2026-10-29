import { translate } from '@docusaurus/Translate';
import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import useIsBrowser from '@docusaurus/useIsBrowser';
export default function ThemeModeSwitch() {
  const ready = useIsBrowser();
  const { colorMode, setColorMode } = useColorMode();
  const label = ready
    ? translate(
        { id: 'site.a747886ebcde', message: '切换到{v0}色模式' },
        {
          v0:
            colorMode === 'dark'
              ? translate({ id: 'site.e445205d07c3', message: '浅' })
              : translate({ id: 'site.d5f3c536a759', message: '深' }),
        },
      )
    : translate({ id: 'site.7a1604323e8b', message: '切换主题' });
  return (
    <button
      type="button"
      className="theme-toggle header-icon-button js-control"
      disabled={!ready}
      aria-label={label}
      title={label}
      onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
    >
      <svg
        className="theme-icon theme-icon-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.9 13.2A8.7 8.7 0 0 1 10.8 3.1a8.8 8.8 0 1 0 10.1 10.1Z" />
      </svg>
      <svg
        className="theme-icon theme-icon-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
