/**
 * useSEO — dynamically updates document title, meta description,
 * canonical URL, and OG tags for each page/route.
 *
 * Usage:
 *   useSEO({ title: 'VJTI Mumbai | UNISCOUT', description: '...' })
 */
import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'UNISCOUT';
const BASE_URL = 'https://www.uniscout.co.in';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSEO({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large');

    setMeta('og:title', ogTitle ?? fullTitle, true);
    setMeta('og:description', ogDescription ?? description, true);
    setMeta('og:image', ogImage ?? DEFAULT_OG_IMAGE, true);
    setMeta('og:url', canonical ?? `${BASE_URL}${window.location.pathname}`, true);

    setMeta('twitter:title', ogTitle ?? fullTitle);
    setMeta('twitter:description', ogDescription ?? description);

    if (canonical) setCanonical(canonical);
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, noIndex]);
}
