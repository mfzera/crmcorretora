import { lazy, Suspense } from 'react';

const ParticleField = lazy(() =>
  import('@/components/landing/three/particle-field').then((m) => ({ default: m.ParticleField }))
);

export function ParticleEmbed() {
  return (
    <Suspense fallback={null}>
      <ParticleField />
    </Suspense>
  );
}
