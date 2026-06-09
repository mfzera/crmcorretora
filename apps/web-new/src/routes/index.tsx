import { createFileRoute } from '@tanstack/react-router';
import { LazyMotion, domAnimation } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { Header, Hero } from '@/components/landing';

const Features = lazy(() =>
  import('@/components/landing/features').then((m) => ({ default: m.Features }))
);
const HowItWorks = lazy(() =>
  import('@/components/landing/how-it-works').then((m) => ({ default: m.HowItWorks }))
);
const PricingPreview = lazy(() =>
  import('@/components/landing/pricing-preview').then((m) => ({ default: m.PricingPreview }))
);
const CTA = lazy(() =>
  import('@/components/landing/cta').then((m) => ({ default: m.CTA }))
);
const Footer = lazy(() =>
  import('@/components/landing/footer').then((m) => ({ default: m.Footer }))
);

function SectionSkeleton() {
  return <div className="min-h-[40vh] bg-white dark:bg-black" aria-hidden />;
}

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Ecotech CRM - CRM para Corretoras de Seguros' },
      {
        name: 'description',
        content:
          'Sistema CRM completo para corretoras de seguros. Gerencie cotações, propostas, renovações e sua equipe em um único lugar. Teste grátis por 7 dias.',
      },
      { property: 'og:title', content: 'Ecotech CRM - CRM para Corretoras de Seguros' },
      {
        property: 'og:description',
        content:
          'Sistema CRM completo para corretoras de seguros. Gerencie cotações, propostas, renovações e sua equipe em um único lugar.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br' }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Ecotech CRM',
          url: 'https://ecotechts.com.br',
          logo: 'https://ecotechts.com.br/logo.svg',
          description: 'Sistema CRM completo para corretoras de seguros no Brasil.',
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'contato@ecosistemaseguro.com.br',
            contactType: 'customer service',
            availableLanguage: 'Portuguese',
          },
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="bg-white dark:bg-black min-h-screen">
        <Header />
        <main>
          <Hero />
          <Suspense fallback={<SectionSkeleton />}><Features /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><HowItWorks /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><PricingPreview /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><CTA /></Suspense>
        </main>
        <Suspense fallback={null}><Footer /></Suspense>
      </div>
    </LazyMotion>
  );
}
