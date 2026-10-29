import { translate } from '@docusaurus/Translate';
import { useSitePath } from '@site/src/lib/use-site-path';
import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import useIsBrowser from '@docusaurus/useIsBrowser';
import type { BlogMedia, BlogPost, BlogIndex } from './types';
import styles from './styles.module.css';
export function Cover({
  media,
  featured = false,
  full = false,
}: {
  media: BlogMedia;
  featured?: boolean;
  full?: boolean;
}) {
  const { siteHref } = useSitePath();
  const [failed, setFailed] = useState(false);
  const { colorMode } = useColorMode();
  const browser = useIsBrowser();
  const selected = !full && media.preview ? media.preview : media;
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth === 0)
      setFailed(true);
  }, [selected.src]);
  return (
    <div
      className={`${styles.cover} ${featured ? styles.featuredCover : ''} ${full ? styles.fullCover : ''}`}
      data-cropped={Boolean(!full && media.preview)}
      style={
        full ? { aspectRatio: `${media.width}/${media.height}` } : undefined
      }
    >
      {failed ? (
        <span
          role="img"
          aria-label={
            media.alt ||
            translate({ id: 'site.62cab5ebabfe', message: '图片暂不可用' })
          }
        >
          {translate({ id: 'site.62cab5ebabfe', message: '图片暂不可用' })}
          {media.alt && <span> · {media.alt}</span>}
        </span>
      ) : (
        <picture>
          {media.srcDark && (full || !media.preview) && (
            <source
              media={
                browser
                  ? colorMode === 'dark'
                    ? 'all'
                    : 'not all'
                  : '(prefers-color-scheme: dark)'
              }
              srcSet={siteHref(media.srcDark)}
            />
          )}
          <img
            ref={imageRef}
            src={siteHref(selected.src)}
            srcSet={selected.variants
              ?.map((variant) => `${siteHref(variant.src)} ${variant.width}w`)
              .join(', ')}
            sizes={
              full
                ? '(max-width: 767px) calc(100vw - 32px), 760px'
                : featured
                  ? '(max-width: 767px) calc(100vw - 64px), (max-width: 1279px) 45vw, 640px'
                  : '(max-width: 767px) calc(100vw - 64px), 264px'
            }
            width={selected.width}
            height={selected.height}
            alt={selected.alt}
            loading={featured || full ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
            style={
              media.preview?.focalPoint && !full
                ? {
                    objectPosition: `${media.preview.focalPoint.x * 100}% ${media.preview.focalPoint.y * 100}%`,
                  }
                : undefined
            }
          />
        </picture>
      )}
    </div>
  );
}
export function PostMeta({ post }: { post: BlogPost }) {
  return (
    <div className={styles.meta}>
      <time dateTime={post.publishedAt}>{post.publishedAt}</time>
      {post.author && <span>{post.author}</span>}
      {post.readingMinutes && (
        <span>
          {translate({ id: 'site.3a029a8ec767', message: '阅读约 ' })}
          {post.readingMinutes}{' '}
          {translate({ id: 'site.40de54344d22', message: ' 分钟' })}
        </span>
      )}
      {post.kind === 'external' && (
        <span>
          {translate({ id: 'site.069f3017fe6c', message: '站外文章 ↗' })}
        </span>
      )}
    </div>
  );
}
export function ArticleCard({
  post,
  index,
  featured = false,
}: {
  post: BlogPost;
  index: BlogIndex;
  featured?: boolean;
}) {
  const { siteHref } = useSitePath();
  const category = index.categories.find((item) => item.id === post.categoryId);
  return (
    <article
      className={`${styles.card} ${featured ? styles.featured : ''}`}
      data-post-id={post.id}
    >
      {post.cover && (
        <a
          className={styles.coverLink}
          href={siteHref(post.href)}
          aria-label={translate(
            { id: 'site.1e928fc6c931', message: '阅读：{v0}' },
            { v0: post.title },
          )}
        >
          <Cover media={post.cover} featured={featured} />
          {!featured && category && (
            <span className={styles.coverCategory}>{category.label}</span>
          )}
        </a>
      )}
      <div className={styles.cardBody}>
        {(featured || (!post.cover && category)) && (
          <div className={styles.badges}>
            {featured && (
              <span className={styles.featuredBadge}>
                {translate({ id: 'site.fac4c8cf0d71', message: '推荐阅读' })}
              </span>
            )}
            {category && (featured || !post.cover) && (
              <span className={styles.categoryBadge}>{category.label}</span>
            )}
          </div>
        )}
        {!featured && <PostMeta post={post} />}
        {featured ? (
          <h2>
            <a href={siteHref(post.href)}>{post.title}</a>
          </h2>
        ) : (
          <h3>
            <a href={siteHref(post.href)}>{post.title}</a>
          </h3>
        )}
        <p className={styles.summary}>{post.summary}</p>
        {featured && <PostMeta post={post} />}
        <div className={styles.cardBottom}>
          {!featured && (
            <div className={styles.articleTags}>
              {post.tagIds.map((id) => (
                <span key={id}>
                  #{index.tags.find((tag) => tag.id === id)?.label}
                </span>
              ))}
            </div>
          )}
          <a
            href={siteHref(post.href)}
            className={featured ? styles.primary : styles.readLink}
          >
            {translate({ id: 'site.b7bac1d85c14', message: '阅读全文' })}{' '}
            <span className={styles.readArrow} aria-hidden="true">
              ↗
            </span>
            <span className="sr-only">
              {translate({ id: 'site.punctuation.colon', message: '：' })}
              {post.title}
            </span>
          </a>
        </div>
      </div>
    </article>
  );
}
export function Channels({ index }: { index: BlogIndex }) {
  if (!index.channels.length) return null;
  return (
    <aside
      className={styles.channels}
      aria-label={translate({
        id: 'site.9ee338478652',
        message: '社区交流渠道',
      })}
    >
      {index.channels.map((channel) => (
        <section className={styles.channel} key={channel.id}>
          <div className={styles.channelTitle}>
            <h2>{channel.title}</h2>
            <span>
              {channel.kind === 'wechat'
                ? 'WeChat'
                : translate({ id: 'site.1bfefe0febb2', message: '知乎' })}
            </span>
          </div>
          <p>{channel.description}</p>
          {channel.qr && <Cover media={channel.qr} full />}
          {channel.contactLabel && (
            <p>
              {channel.contactLabel}
              {translate({ id: 'site.punctuation.colon', message: '：' })}
              <strong>{channel.contactValue}</strong>
            </p>
          )}
          {channel.href && (
            <a href={channel.href}>
              {translate({ id: 'site.fa96079c3b2f', message: '前往' })}
              {channel.title} ↗
            </a>
          )}
        </section>
      ))}
    </aside>
  );
}
