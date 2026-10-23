import React from 'react';
import * as Select from '@radix-ui/react-select';
import { Icon } from './components';
import styles from './CatalogSelect.module.css';

type Option = { value: string; label: string };

export default function CatalogSelect({
  label,
  value,
  options,
  onValueChange,
  active = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onValueChange: (value: string) => void;
  active?: boolean;
}) {
  // Radix reserves an empty value for placeholders; prefix every option so
  // the catalog's empty (all values) option remains selectable.
  const encode = (value: string) => `option:${value}`;
  return (
    <Select.Root
      value={encode(value)}
      onValueChange={(next) => onValueChange(next.slice(7))}
    >
      <Select.Trigger
        className={styles.trigger}
        aria-label={label}
        data-active={active}
        type="button"
      >
        <span className={styles.value}>
          <Select.Value>
            {options.find((o) => o.value === value)?.label}
          </Select.Value>
        </span>
        <Select.Icon className={styles.chevron}>
          <Icon name="chevron" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={styles.content}
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className={styles.scrollUp}>
            <Icon name="chevron" />
          </Select.ScrollUpButton>
          <Select.Viewport className={styles.viewport}>
            <Select.Group>
              <Select.Label className={styles.label}>{label}</Select.Label>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={encode(option.value)}
                  className={styles.item}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className={styles.indicator}>
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="m3.5 8 3 3 6-6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className={styles.scrollDown}>
            <Icon name="chevron" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
