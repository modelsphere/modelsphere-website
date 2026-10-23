import React, { type CSSProperties } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
export default function BrandLogo() {
  const logo = useBaseUrl('/brand/modelsphere-logo.png');
  return (
    <span
      className="site-brand-art"
      style={{ '--brand-logo': `url("${logo}")` } as CSSProperties}
      aria-hidden="true"
    >
      <img src={logo} alt="" width="1548" height="177" />
    </span>
  );
}
