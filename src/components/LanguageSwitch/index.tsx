import React from 'react';
import * as Select from '@radix-ui/react-select';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useLocation } from '@docusaurus/router';
import { languageHref } from '@site/src/lib/locale';
import styles from './styles.module.css';

const languages = [
  { value: 'zh-CN', label: '简体中文', code: 'ZH' },
  { value: 'en', label: 'English', code: 'EN' },
];

export default function LanguageSwitch() {
  const { i18n, siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const browser = useIsBrowser();
  const english = i18n.currentLocale === 'en';
  const href = languageHref(
    location.pathname,
    browser ? location.search : '',
    browser ? location.hash : '',
    siteConfig.baseUrl,
    i18n.currentLocale,
  );
  const label = english ? 'Change language' : '切换语言';
  return (
    <div className={styles.root}>
      <Select.Root
        value={i18n.currentLocale}
        onValueChange={(locale) => {
          if (locale !== i18n.currentLocale) window.location.assign(href);
        }}
      >
        <Select.Trigger
          type="button"
          className={`${styles.trigger} js-control`}
          aria-label={label}
          disabled={!browser}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z" />
          </svg>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className={styles.content}
            position="popper"
            align="end"
            sideOffset={8}
            collisionPadding={12}
          >
            <Select.Viewport className={styles.viewport}>
              <Select.Group>
                <Select.Label className={styles.label}>
                  {english ? 'Language' : '选择语言'}
                </Select.Label>
                {languages.map((language) => (
                  <Select.Item
                    key={language.value}
                    value={language.value}
                    className={styles.item}
                    lang={language.value}
                    textValue={language.label}
                  >
                    <Select.ItemIndicator className={styles.indicator}>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m3.5 8 3 3 6-6" />
                      </svg>
                    </Select.ItemIndicator>
                    <Select.ItemText>{language.label}</Select.ItemText>
                    <span className={styles.code} aria-hidden="true">
                      {language.code}
                    </span>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <noscript>
        <a
          className={styles.fallback}
          href={href}
          hrefLang={english ? 'zh-CN' : 'en'}
          lang={english ? 'zh-CN' : 'en'}
          aria-label={english ? '切换到简体中文' : 'Switch to English'}
        >
          {english ? '中文' : 'EN'}
        </a>
      </noscript>
    </div>
  );
}
