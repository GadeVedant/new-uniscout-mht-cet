/**
 * SchemaOrg — injects a JSON-LD <script> tag into <head>.
 * Renders nothing visible; purely for structured data.
 *
 * Usage:
 *   <SchemaOrg schema={{ "@type": "CollegeOrUniversity", ... }} />
 */
import { useEffect } from 'react';

interface SchemaOrgProps {
  schema: Record<string, unknown>;
  id?: string; // unique id so multiple schemas don't collide
}

export function SchemaOrg({ schema, id = 'schema-org' }: SchemaOrgProps) {
  useEffect(() => {
    const scriptId = `ld-json-${id}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.id = scriptId;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', ...schema });

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [schema, id]);

  return null;
}

// ---------------------------------------------------------------------------
// Pre-built schema factories
// ---------------------------------------------------------------------------

export function collegeSchema(college: {
  name: string;
  code: string;
  location: string;
  district: string;
  branch: string;
  fees?: string;
  seats?: number;
  cutoffPercentile?: number;
  avgPackage?: string | null;
}) {
  return {
    '@type': ['CollegeOrUniversity', 'EducationalOrganization'],
    name: college.name,
    identifier: college.code,
    address: {
      '@type': 'PostalAddress',
      addressLocality: college.location,
      addressRegion: college.district || 'Maharashtra',
      addressCountry: 'IN',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Engineering Programs',
      itemListElement: [{
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Course',
          name: college.branch,
          provider: { '@type': 'CollegeOrUniversity', name: college.name },
          ...(college.fees ? { offers: { '@type': 'Offer', price: college.fees, priceCurrency: 'INR' } } : {}),
        },
      }],
    },
    ...(college.seats ? { numberOfStudents: college.seats } : {}),
    ...(college.avgPackage ? { description: `Average placement package: ${college.avgPackage}` } : {}),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function webPageSchema(page: {
  name: string;
  description: string;
  url: string;
  breadcrumbs?: { name: string; url: string }[];
}) {
  return {
    '@type': 'WebPage',
    name: page.name,
    description: page.description,
    url: page.url,
    isPartOf: { '@type': 'WebSite', name: 'Uniscout', url: 'https://www.Uniscout.co.in' },
    ...(page.breadcrumbs ? {
      breadcrumb: breadcrumbSchema(page.breadcrumbs),
    } : {}),
  };
}

export function howToSchema(data: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    step: data.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
