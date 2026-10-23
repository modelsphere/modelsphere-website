import { useEffect, useRef, type RefObject } from 'react';
import { useHistory } from '@docusaurus/router';

const seenHomeHistories = new WeakSet<object>();

/** Enhances unread sections after hydration; server-rendered content stays readable. */
export function useHomeMotion(root: RefObject<HTMLElement | null>): void {
  const history = useHistory();
  // Initial document loads also use POP, including entries with no location key.
  const isPopReturn = useRef(
    history.action === 'POP' && seenHomeHistories.has(history),
  );
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    seenHomeHistories.add(history);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 767px)');
    const desktop = window.matchMedia('(min-width: 1280px)');
    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-home-reveal="comparison"], [data-home-reveal="panel"]',
      ),
    );
    const pairOwners = new Map<HTMLElement, HTMLElement>();
    const revealTargets = blocks.flatMap((block) => {
      if (!block.hasAttribute('data-home-pair')) return [block];
      const children = Array.from(block.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      for (const child of children) pairOwners.set(child, block);
      return children;
    });
    const hero = container.querySelector<HTMLElement>('#hero');
    const architecture = container.querySelector<HTMLElement>(
      '[data-home-architecture]',
    );
    const heroText = Array.from(
      container.querySelectorAll<HTMLElement>(
        'h1[data-home-hero="title"], p[data-home-hero="lead"], p[data-home-hero="description"]',
      ),
    );
    const introTargets = Array.from(
      container.querySelectorAll<HTMLElement>('[data-home-intro]'),
    );
    const intros = new Set(introTargets);
    const pending = new Set<HTMLElement>();
    const pairedTriggerRatio = 0.85;
    const introTriggerRatio = 0.88;
    const pendingBoundary = (element: HTMLElement) =>
      window.innerHeight *
      (intros.has(element)
        ? introTriggerRatio
        : pairOwners.has(element)
          ? pairedTriggerRatio
          : 1);
    const animations = new Map<HTMLElement, Animation[]>();
    const temporaryFocus = new Map<HTMLElement, () => void>();
    let observer: IntersectionObserver | undefined;
    let pairedObserver: IntersectionObserver | undefined;
    let introObserver: IntersectionObserver | undefined;
    let smoothScrollActive = false;
    let enhancementStopped = false;
    let initialized = false;
    let suspended = false;
    let targetHint: HTMLElement | undefined;
    let targetHintTimer: number | undefined;

    const clearTargetHint = () => {
      if (targetHintTimer !== undefined) window.clearTimeout(targetHintTimer);
      targetHint?.removeAttribute('data-home-target-hint');
      targetHint = undefined;
      targetHintTimer = undefined;
    };

    const finish = (element: HTMLElement) => {
      pending.delete(element);
      element.removeAttribute('data-home-pending');
      const active = animations.get(element) ?? [];
      animations.delete(element);
      for (const animation of active) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
      }
      observer?.unobserve(element);
      pairedObserver?.unobserve(element);
      introObserver?.unobserve(element);
    };
    const suspend = () => {
      suspended = true;
      clearTargetHint();
      for (const element of animations.keys()) finish(element);
      observer?.disconnect();
      pairedObserver?.disconnect();
      introObserver?.disconnect();
      if (smoothScrollActive) {
        window.scrollTo({
          left: window.scrollX,
          top: window.scrollY,
          behavior: 'instant',
        });
        smoothScrollActive = false;
      }
    };
    const finishAll = () => {
      enhancementStopped = true;
      for (const element of revealTargets)
        element.removeAttribute('data-home-pending');
      architecture?.removeAttribute('data-home-pending');
      for (const element of introTargets)
        element.removeAttribute('data-home-pending');
      pending.clear();
      suspend();
    };
    const finishTarget = (target: Element) => {
      for (const element of introTargets) {
        if (element.contains(target) || target.contains(element))
          finish(element);
      }
      if (hero && (hero.contains(target) || target.contains(hero))) {
        for (const element of heroText) finish(element);
        if (architecture) finish(architecture);
      }
      for (const element of blocks) {
        if (element.contains(target) || target.contains(element)) {
          for (const candidate of revealTargets) {
            if (candidate === element || pairOwners.get(candidate) === element)
              finish(candidate);
          }
        }
      }
    };
    const hashTarget = (hash: string): HTMLElement | null => {
      if (!hash || hash === '#') return null;
      try {
        return document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return null;
      }
    };
    const settleHash = () => {
      const target = hashTarget(window.location.hash);
      if (target) finishTarget(target);
    };
    const focusTarget = (target: HTMLElement) => {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        const restore = () => {
          if (target.getAttribute('tabindex') === '-1')
            target.removeAttribute('tabindex');
          target.removeEventListener('blur', restore);
          temporaryFocus.delete(target);
        };
        temporaryFocus.set(target, restore);
        target.addEventListener('blur', restore);
      }
      target.focus({ preventScroll: true });
    };
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (
        !link ||
        link.hasAttribute('download') ||
        (link.target && link.target !== '_self')
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search
      )
        return;
      const target = hashTarget(url.hash);
      if (!target) return;

      finishTarget(target);
      const nearby =
        Math.abs(target.getBoundingClientRect().top) <= window.innerHeight;
      const smooth = event.detail > 0 && nearby && !reduced.matches;
      event.preventDefault();
      if (window.location.hash !== url.hash)
        window.history.pushState(window.history.state, '', url.href);
      smoothScrollActive = smooth;
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
      focusTarget(target);
      showTargetHint(target);
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element) finishTarget(event.target);
    };
    const onVisibility = () => {
      if (document.hidden) {
        suspend();
      } else resumeWhenVisible();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) finishAll();
    };
    const onPreference = () => {
      if (reduced.matches) finishAll();
    };
    const onScrollEnd = () => {
      smoothScrollActive = false;
    };

    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const restored = navigation?.type === 'back_forward' || isPopReturn.current;
    const css = getComputedStyle(container);
    const token = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const duration = (name: string, fallback: number) => {
      const value = Number.parseFloat(token(name, `${fallback}ms`));
      return Number.isFinite(value) ? value : fallback;
    };
    const introFrames: Keyframe[] = [
      {
        opacity: 0,
        transform: `translateY(${token('--motion-distance-intro', '16px')})`,
      },
      { opacity: 1, transform: 'translateY(0)' },
    ];
    const introTiming: KeyframeAnimationOptions = {
      duration: duration('--motion-duration-intro', 700),
      easing: token(
        '--motion-easing-intro',
        'cubic-bezier(.333333, 1, .666667, 1)',
      ),
      fill: 'backwards',
    };
    const showTargetHint = (target: HTMLElement) => {
      clearTargetHint();
      if (reduced.matches || document.hidden) return;
      targetHint = target;
      target.setAttribute('data-home-target-hint', '');
      targetHintTimer = window.setTimeout(
        clearTargetHint,
        duration('--motion-duration-target-hint', 600),
      );
    };
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      );
    };
    const playHero = (currentTarget: HTMLElement | null) => {
      const title = heroText.find(
        (element) => element.dataset.homeHero === 'title',
      );
      if (
        !hero ||
        !title ||
        !visible(title) ||
        hero.contains(document.activeElement) ||
        (currentTarget && !hero.contains(currentTarget))
      )
        return;
      const titleDistance = compact.matches
        ? token('--motion-distance-hero-compact', '32px')
        : token('--motion-distance-hero', '48px');
      const rotation = compact.matches
        ? token('--motion-rotate-hero-compact', '12deg')
        : token('--motion-rotate-hero', '18deg');
      const scale = token('--motion-scale-hero', '0.96');
      const perspective = token('--motion-perspective-hero', '900px');
      const initialOpacity = Number.parseFloat(
        token('--motion-opacity-hero', '0'),
      );
      const opacity = Number.isFinite(initialOpacity) ? initialOpacity : 0;
      for (const element of heroText) {
        if (!visible(element)) continue;
        const isTitle = element.dataset.homeHero === 'title';
        const keyframes: Keyframe[] = isTitle
          ? [
              {
                opacity,
                transform: `perspective(${perspective}) translate3d(0, ${titleDistance}, 0) rotateX(${rotation}) scale(${scale})`,
                transformOrigin: '0% 100%',
              },
              {
                opacity: 1,
                transform: `perspective(${perspective}) translate3d(0, 0, 0) rotateX(0deg) scale(1)`,
                transformOrigin: '0% 100%',
              },
            ]
          : introFrames;
        try {
          const animation = element.animate(keyframes, {
            duration: isTitle
              ? compact.matches
                ? duration('--motion-duration-hero-compact', 850)
                : duration('--motion-duration-hero', 1050)
              : introTiming.duration,
            easing: isTitle
              ? token('--motion-easing-hero', 'cubic-bezier(.22, 1, .36, 1)')
              : introTiming.easing,
            fill: 'backwards',
          });
          animations.set(element, [animation]);
          animation.onfinish = () => finish(element);
          animation.oncancel = () => finish(element);
        } catch {
          finish(element);
        }
      }
    };
    const playArchitecture = (element: HTMLElement) => {
      try {
        const animation = element.animate(
          [
            {
              opacity: 0,
              transform: `translateY(${token('--motion-distance-architecture', '32px')})`,
            },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: duration('--motion-duration-architecture', 700),
            easing: token(
              '--motion-easing-architecture',
              'cubic-bezier(.22, .61, .36, 1)',
            ),
            fill: 'backwards',
          },
        );
        element.removeAttribute('data-home-pending');
        animations.set(element, [animation]);
        animation.onfinish = () => finish(element);
        animation.oncancel = () => finish(element);
      } catch {
        finish(element);
      }
    };
    const onIntersection: IntersectionObserverCallback = (entries, source) => {
      // A disconnected observer can still deliver an already queued callback.
      if (
        source !== observer &&
        source !== pairedObserver &&
        source !== introObserver
      )
        return;
      const queue = entries.map(({ target, isIntersecting }) => ({
        target,
        isIntersecting,
      }));
      for (const entry of queue) {
        const element = entry.target as HTMLElement;
        if (!entry.isIntersecting) {
          const rect = element.getBoundingClientRect();
          if (intros.has(element) && rect.bottom <= 0) {
            finish(element);
            continue;
          }
          // Entry transforms can cross the reading line while still on screen.
          if (
            animations.has(element) &&
            ((!pairOwners.has(element) &&
              element !== architecture &&
              !intros.has(element)) ||
              rect.bottom <= 0 ||
              rect.top >= window.innerHeight)
          )
            finish(element);
          continue;
        }
        if (!pending.has(element)) continue;
        if (suspended || document.hidden) continue;
        pending.delete(element);
        if (reduced.matches || enhancementStopped) {
          finish(element);
          continue;
        }
        if (intros.has(element)) {
          try {
            const animation = element.animate(introFrames, introTiming);
            element.removeAttribute('data-home-pending');
            animations.set(element, [animation]);
            animation.onfinish = () => finish(element);
            animation.oncancel = () => finish(element);
          } catch {
            finish(element);
          }
          continue;
        }
        if (element === architecture) {
          playArchitecture(element);
          continue;
        }
        const owner = pairOwners.get(element);
        const comparison = element.dataset.homeReveal === 'comparison';
        const row = owner
          ? revealTargets.filter(
              (candidate) =>
                pairOwners.get(candidate) === owner &&
                candidate.offsetTop <
                  element.offsetTop + element.offsetHeight &&
                element.offsetTop <
                  candidate.offsetTop + candidate.offsetHeight,
            )
          : [];
        const horizontal = row.some(
          (candidate) =>
            candidate !== element &&
            (candidate.offsetLeft >= element.offsetLeft + element.offsetWidth ||
              element.offsetLeft >=
                candidate.offsetLeft + candidate.offsetWidth),
        );
        if (horizontal) {
          for (const sibling of row) {
            if (
              pending.has(sibling) &&
              !queue.some(
                (item) => item.target === sibling && item.isIntersecting,
              )
            )
              queue.push({ target: sibling, isIntersecting: true });
          }
        }
        const distance = compact.matches
          ? token('--motion-distance-enter', '4px')
          : token('--motion-distance-reveal', '8px');
        try {
          const pairedDistance = Number.parseFloat(
            token('--motion-distance-paired', '60px'),
          );
          const pairedOpacity = Number.parseFloat(
            token('--motion-opacity-paired', '0'),
          );
          const opacity = Number.isFinite(pairedOpacity) ? pairedOpacity : 0;
          const rowCenter = horizontal
            ? (Math.min(...row.map((target) => target.offsetLeft)) +
                Math.max(
                  ...row.map(
                    (target) => target.offsetLeft + target.offsetWidth,
                  ),
                )) /
              2
            : 0;
          const left =
            element.offsetLeft + element.offsetWidth / 2 <= rowCenter;
          // Clip only at the page edge so every desktop pair travels the full distance.
          const offset = Number.isFinite(pairedDistance) ? pairedDistance : 60;
          const animation = element.animate(
            owner
              ? horizontal
                ? [
                    {
                      opacity,
                      transform: `translateX(${left ? -offset : offset}px)`,
                    },
                    { opacity: 1, transform: 'translateX(0)' },
                  ]
                : [
                    {
                      opacity,
                      transform: `translateY(${token('--motion-distance-paired-stacked', '28px')})`,
                    },
                    { opacity: 1, transform: 'translateY(0)' },
                  ]
              : comparison
                ? [{ opacity: 0.85 }, { opacity: 1 }]
                : [
                    { opacity: 0.85, transform: `translateY(${distance})` },
                    { opacity: 1, transform: 'translateY(0)' },
                  ],
            {
              duration: owner
                ? horizontal
                  ? duration('--motion-duration-paired', 900)
                  : duration('--motion-duration-paired-stacked', 700)
                : comparison || compact.matches
                  ? duration('--motion-duration-reveal-compact', 240)
                  : duration('--motion-duration-reveal', 320),
              easing:
                owner && horizontal
                  ? token(
                      '--motion-easing-hero',
                      'cubic-bezier(.22, 1, .36, 1)',
                    )
                  : token(
                      '--motion-easing-standard',
                      'cubic-bezier(.2, 0, 0, 1)',
                    ),
            },
          );
          element.removeAttribute('data-home-pending');
          animations.set(element, [animation]);
          animation.onfinish = () => finish(element);
          animation.oncancel = () => finish(element);
        } catch {
          finish(element);
        }
      }
    };
    const observePending = () => {
      observer?.disconnect();
      pairedObserver?.disconnect();
      introObserver?.disconnect();
      suspended = false;
      observer = new IntersectionObserver(onIntersection, {
        // IntersectionObserver percentage margins use width, so use height pixels.
        rootMargin: `0px 0px -${window.innerHeight * 0.08}px 0px`,
      });
      pairedObserver = new IntersectionObserver(onIntersection, {
        rootMargin: `0px 0px -${Math.round(window.innerHeight * (1 - pairedTriggerRatio))}px 0px`,
      });
      introObserver = new IntersectionObserver(onIntersection, {
        rootMargin: `0px 0px -${Math.round(window.innerHeight * (1 - introTriggerRatio))}px 0px`,
      });
      for (const element of pending) {
        const owner = pairOwners.get(element);
        // Both columns and stacked blocks stay blank until their own entry starts.
        if (owner || element === architecture || intros.has(element))
          element.setAttribute('data-home-pending', '');
        (intros.has(element)
          ? introObserver
          : owner
            ? pairedObserver
            : observer
        ).observe(element);
      }
    };
    const onResize = () => {
      if (enhancementStopped || !observer) return;
      suspend();
      resumeWhenVisible();
    };

    const initializeWhenVisible = () => {
      if (initialized || enhancementStopped || document.hidden) return;
      if (reduced.matches) {
        finishAll();
        return;
      }
      initialized = true;
      const currentTarget = hashTarget(window.location.hash);
      playHero(currentTarget);
      if (
        architecture &&
        !currentTarget &&
        !hero?.contains(document.activeElement) &&
        architecture.getBoundingClientRect().bottom > 0
      )
        pending.add(architecture);
      for (const element of introTargets) {
        if (
          element.getBoundingClientRect().bottom > 0 &&
          !element.contains(document.activeElement) &&
          !(
            currentTarget &&
            (element.contains(currentTarget) || currentTarget.contains(element))
          )
        )
          pending.add(element);
      }
      for (const element of revealTargets) {
        const owner = pairOwners.get(element) ?? element;
        if (
          element.getBoundingClientRect().top >= pendingBoundary(element) &&
          !owner.contains(document.activeElement) &&
          !(
            currentTarget &&
            (owner.contains(currentTarget) || currentTarget.contains(owner))
          )
        )
          pending.add(element);
      }
      observePending();
    };
    const resumeWhenVisible = () => {
      if (enhancementStopped || document.hidden) return;
      if (!initialized) {
        initializeWhenVisible();
        return;
      }
      if (reduced.matches) {
        finishAll();
        return;
      }
      const currentTarget = hashTarget(window.location.hash);
      for (const element of pending) {
        const owner = pairOwners.get(element) ?? element;
        if (
          element.getBoundingClientRect().top < pendingBoundary(element) ||
          owner.contains(document.activeElement) ||
          (currentTarget &&
            (owner.contains(currentTarget) || currentTarget.contains(owner)))
        )
          finish(element);
      }
      observePending();
    };
    const onBreakpoint = () => {
      suspend();
      resumeWhenVisible();
    };
    if (
      reduced.matches ||
      restored ||
      typeof IntersectionObserver === 'undefined' ||
      typeof HTMLElement.prototype.animate !== 'function'
    )
      enhancementStopped = true;
    initializeWhenVisible();

    container.addEventListener('click', onClick);
    container.addEventListener('focusin', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('hashchange', settleHash);
    window.addEventListener('popstate', finishAll);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener('resize', onResize);
    reduced.addEventListener('change', onPreference);
    compact.addEventListener('change', onBreakpoint);
    desktop.addEventListener('change', onBreakpoint);
    return () => {
      finishAll();
      for (const restore of temporaryFocus.values()) restore();
      container.removeEventListener('click', onClick);
      container.removeEventListener('focusin', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('hashchange', settleHash);
      window.removeEventListener('popstate', finishAll);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('resize', onResize);
      reduced.removeEventListener('change', onPreference);
      compact.removeEventListener('change', onBreakpoint);
      desktop.removeEventListener('change', onBreakpoint);
    };
  }, [history, root]);
}
