import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ParticleEmbed = lazy(() =>
  import('@/components/embed/particle-embed').then((m) => ({ default: m.ParticleEmbed })),
);

export const Route = createFileRoute('/embed/particles')({
  component: ParticlesPage,
});

function ParticlesPage() {
  return (
    <>
      <style>{`html,body{margin:0;padding:0;background:transparent!important;overflow:hidden}`}</style>
      <Suspense fallback={null}>
        <ParticleEmbed />
      </Suspense>
    </>
  );
}
