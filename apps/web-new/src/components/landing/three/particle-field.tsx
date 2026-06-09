
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 90;
const MAX_LINE_VERTS = 600; // 300 line segments × 2 verts
const CONNECTION_DIST = 4.2;

interface Mouse {
  x: number;
  y: number;
}

function Network({ mouseRef }: { mouseRef: React.RefObject<Mouse> }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions, velocities };
  }, []);

  const linePositions = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);

  useFrame(() => {
    if (!pointsRef.current || !linesRef.current) return;

    const pAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const pos = pAttr.array as Float32Array;

    const mouse = mouseRef.current;
    const mx = mouse ? mouse.x * 13 : 0;
    const my = mouse ? mouse.y * 8 : 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      pos[ix] += velocities[ix];
      pos[ix + 1] += velocities[ix + 1];
      pos[ix + 2] += velocities[ix + 2];

      if (Math.abs(pos[ix]) > 13) velocities[ix] *= -1;
      if (Math.abs(pos[ix + 1]) > 8) velocities[ix + 1] *= -1;
      if (Math.abs(pos[ix + 2]) > 2.5) velocities[ix + 2] *= -1;

      // Mouse repulsion
      const dx = pos[ix] - mx;
      const dy = pos[ix + 1] - my;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < 20 && dist2 > 0.001) {
        const dist = Math.sqrt(dist2);
        const force = ((4.5 - Math.min(dist, 4.5)) / 4.5) * 0.05;
        pos[ix] += (dx / dist) * force;
        pos[ix + 1] += (dy / dist) * force;
      }
    }
    pAttr.needsUpdate = true;

    const lAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const lineArr = lAttr.array as Float32Array;
    let li = 0;

    for (let i = 0; i < PARTICLE_COUNT && li < MAX_LINE_VERTS - 2; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT && li < MAX_LINE_VERTS - 2; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < CONNECTION_DIST) {
          lineArr[li * 3] = pos[i * 3];
          lineArr[li * 3 + 1] = pos[i * 3 + 1];
          lineArr[li * 3 + 2] = pos[i * 3 + 2];
          li++;
          lineArr[li * 3] = pos[j * 3];
          lineArr[li * 3 + 1] = pos[j * 3 + 1];
          lineArr[li * 3 + 2] = pos[j * 3 + 2];
          li++;
        }
      }
    }

    for (let i = li; i < MAX_LINE_VERTS; i++) {
      lineArr[i * 3] = 0;
      lineArr[i * 3 + 1] = 0;
      lineArr[i * 3 + 2] = -500;
    }
    lAttr.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#3B82F6"
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3B82F6" transparent opacity={0.13} />
      </lineSegments>
    </>
  );
}

export function ParticleField() {
  const mouseRef = useRef<Mouse>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 55 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
    >
      <Network mouseRef={mouseRef} />
    </Canvas>
  );
}
