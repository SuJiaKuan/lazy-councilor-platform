import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function productionMetadata(address: string): Plugin {
  const url = new URL(address);
  if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be a public HTTPS homepage URL.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  const homepage = url.href;
  const image = new URL('share.png', url).href;
  const imageAlt = '誰是政見偷懶王，2022 與 2026 年議員選舉公報逐字比對';
  return {
    name: 'production-metadata',
    apply: 'build',
    transformIndexHtml: {
      handler: () => [
        { tag: 'link', attrs: { rel: 'canonical', href: homepage }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: homepage }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: imageAlt }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: imageAlt }, injectTo: 'head' },
        {
          tag: 'script', attrs: { type: 'application/ld+json' },
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: '誰是政見偷懶王',
            url: homepage,
            inLanguage: 'zh-Hant-TW',
          }),
          injectTo: 'head',
        },
      ],
    },
  };
}

export default defineConfig(({ mode }) => {
  const { SITE_URL } = loadEnv(mode, process.cwd(), 'SITE_URL');
  return {
    base: './',
    plugins: [react(), ...(SITE_URL ? [productionMetadata(SITE_URL)] : [])],
    server: { port: 5174 },
  };
});
