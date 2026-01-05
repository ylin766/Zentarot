
import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface AshEffectProps {
  position: [number, number, number];
  textureUrl?: string; // Add texture URL prop
  onComplete: () => void;
  targetPosition?: [number, number, number]; // Target for absorption
}

const AshEffect: React.FC<AshEffectProps> = ({ position, textureUrl, onComplete, targetPosition }) => {
  const count = 12000; // 优化：减少粒子数量以提升性能
  const pointsRef = useRef<THREE.Points>(null);
  const startTime = useRef(Date.now());
  const hasCompleted = useRef(false);

  // Use refs for particle data to allow mutable updates without re-triggering useMemo
  // that would reset physics state
  const colorsRef = useRef<Float32Array | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);

  // Initialize particles strictly ONCE
  const { particles, velocities, lifetimes, initialLifetimes, colors, sizes } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    const l = new Float32Array(count);
    const il = new Float32Array(count);
    const c = new Float32Array(count * 3);
    const s = new Float32Array(count);

    const width = 2.5;
    const height = 4.3;

    for (let i = 0; i < count; i++) {
      // Position
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 0.02; // Very thin layer

      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;

      // Default Fire Colors (Fallback)
      const colorPhase = Math.random();
      let r = 1, g = 1, b = 1;
      if (colorPhase < 0.2) { r = 1; g = 0.9; b = 0.5; }
      else if (colorPhase < 0.5) { r = 1; g = 0.5; b = 0.1; }
      else if (colorPhase < 0.8) { r = 0.8; g = 0.2; b = 0.1; }
      else { r = 0.3; g = 0.3; b = 0.3; }

      c[i * 3] = r;
      c[i * 3 + 1] = g;
      c[i * 3 + 2] = b;

      // Velocities - 减少初始向上速度，让吸收更自然
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.01 + Math.random() * 0.02;
      v[i * 3] = Math.cos(angle) * speed * 0.3;
      v[i * 3 + 1] = 0.01 + Math.random() * 0.02; // 更小的向上速度
      v[i * 3 + 2] = Math.sin(angle) * speed * 0.3;

      const baseLife = 0.8 + Math.random() * 1.0;
      l[i] = baseLife;
      il[i] = baseLife;

      s[i] = 0.015 + Math.random() * 0.015; // Much smaller particles
    }

    return { particles: p, velocities: v, lifetimes: l, initialLifetimes: il, colors: c, sizes: s };
  }, []); // Run once

  // Store refs for access in useFrame and effects
  useEffect(() => {
    colorsRef.current = colors;
    // Backup original colors (currently fallback)
    originalColorsRef.current = new Float32Array(colors);
  }, [colors]);

  // Texture Sampling Effect
  useEffect(() => {
    if (!textureUrl || !colorsRef.current || !originalColorsRef.current) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = textureUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Higher resolution sampling for 20k particles
        const w = 100;
        const h = 175;
        canvas.width = w;
        canvas.height = h;

        // Draw and flip
        ctx.translate(0, h);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, w, h);

        const data = ctx.getImageData(0, 0, w, h).data;
        const width = 2.5;
        const height = 4.3;

        const p = particles;
        const c = colorsRef.current;
        const oc = originalColorsRef.current;

        // Use local copies to minimize property access overhead in loop
        if (c && oc) {
          for (let i = 0; i < count; i++) {
            const x = p[i * 3];
            const y = p[i * 3 + 1];

            const u = (x / width) + 0.5;
            const v = (y / height) + 0.5;

            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
              const px = Math.floor(u * w);
              const py = Math.floor(v * h);
              const idx = (py * w + px) * 4;

              if (idx >= 0 && idx < data.length) {
                const r = data[idx] / 255;
                const g = data[idx + 1] / 255;
                const b = data[idx + 2] / 255;

                c[i * 3] = r;
                c[i * 3 + 1] = g;
                c[i * 3 + 2] = b;

                oc[i * 3] = r;
                oc[i * 3 + 1] = g;
                oc[i * 3 + 2] = b;
              }
            }
          }
          if (pointsRef.current) {
            pointsRef.current.geometry.attributes.color.needsUpdate = true;
          }
        }
      } catch (e) {
        console.error("Failed to sample card texture:", e);
      }
    };
  }, [textureUrl, particles]);

  // Use a ref for time to avoid stale closure if needed, though useFrame arg is fine
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!pointsRef.current || hasCompleted.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colorsArr = pointsRef.current.geometry.attributes.color.array as Float32Array;

    // We need original colors to lerp from
    const origColors = originalColorsRef.current;

    let allDead = true;
    const elapsed = Date.now() - startTime.current;

    // Smooth time factor
    timeRef.current += delta * 0.5;
    const time = timeRef.current;

    // Convert local target to world space if needed, BUT particles are in local space of this component?
    // AshEffect position logic:
    // <points position={position}> ... </points>
    // So particles are local to `position`.
    // We need to convert `targetPosition` (world) to local space.
    // LocalTarget = TargetWorld - MyPosition
    let localTargetX = 0, localTargetY = 0, localTargetZ = 0;
    if (targetPosition) {
      localTargetX = targetPosition[0] - position[0];
      localTargetY = targetPosition[1] - position[1];
      localTargetZ = targetPosition[2] - position[2];
    }

    const absorptionStrength = 5.0; // Strong pull

    for (let i = 0; i < count; i++) {
      if (lifetimes[i] <= 0) {
        positions[i * 3] = 9999;
        continue;
      }
      allDead = false;

      // Noise / motion logic - smoother fluid motion
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      let vx = velocities[i * 3];
      let vy = velocities[i * 3 + 1];
      let vz = velocities[i * 3 + 2];

      const lifeRatio = lifetimes[i] / initialLifetimes[i];

      // Absorption Logic - 更早开始吸收，让粒子直接向目标移动
      if (targetPosition && lifeRatio < 0.85) {
        const dx = localTargetX - x;
        const dy = localTargetY - y;
        const dz = localTargetZ - z;

        // Normalized direction
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist > 0.1) {
          const force = (1.0 - lifeRatio) * absorptionStrength * delta; // Increases as it dies
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
          vz += (dz / dist) * force;

          // 更强的阻尼，防止粒子绕到上方
          vx *= 0.85;
          vy *= 0.85;
          vz *= 0.85;
        }
      }

      // More subtle, flowing noise
      const noiseX = Math.sin(y * 1.5 + time) * Math.cos(z * 1.0 + time) * 0.005;
      const noiseY = Math.sin(x * 2.0 + time) * 0.003;
      const noiseZ = Math.cos(x * 1.5 + time) * Math.sin(y * 1.5 + time) * 0.005;

      vx += noiseX;
      vy += noiseY;
      vz += noiseZ;

      positions[i * 3] += vx;
      positions[i * 3 + 1] += vy;
      positions[i * 3 + 2] += vz;

      velocities[i * 3] = vx; // Update velocity state? 
      // Actually original code didn't update velocity state array except adding noise in place
      // We should probably preserve momentum if we want attraction to work well
      velocities[i * 3 + 1] = vy;
      velocities[i * 3 + 2] = vz;

      lifetimes[i] -= delta * 1.0; // Standard decay


      // Color transition logic
      if (origColors) {
        const or = origColors[i * 3];
        const og = origColors[i * 3 + 1];
        const ob = origColors[i * 3 + 2];

        if (lifeRatio > 0.7) { // Longer original color retention
          colorsArr[i * 3] = or;
          colorsArr[i * 3 + 1] = og;
          colorsArr[i * 3 + 2] = ob;
        } else if (lifeRatio > 0.3) {
          // Mix to Fire
          const t = (0.7 - lifeRatio) / 0.4;
          // Fire colors (Golden/White hot first, then Orange)
          const fr = 1.0;
          const fg = 0.6;
          const fb = 0.2;

          colorsArr[i * 3] = or * (1 - t) + fr * t;
          colorsArr[i * 3 + 1] = og * (1 - t) + fg * t;
          colorsArr[i * 3 + 2] = ob * (1 - t) + fb * t;
        } else {
          // Mix to Ash / Energy (Cyan/Gold for absorption?)
          // Let's stick to Gold since the UI is Gold
          const t = (0.3 - lifeRatio) / 0.3;

          // Gold color target
          const gr = 1.0;
          const gg = 0.8;
          const gb = 0.2;

          // Previous was Fire
          const fr = 1.0; const fg = 0.6; const fb = 0.2;

          colorsArr[i * 3] = fr * (1 - t) + gr * t;
          colorsArr[i * 3 + 1] = fg * (1 - t) + gg * t;
          colorsArr[i * 3 + 2] = fb * (1 - t) + gb * t;
        }
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    if ((allDead || elapsed > 2000) && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02} // Finer points
        vertexColors
        transparent
        opacity={0.9} // Higher opacity for density
        blending={THREE.AdditiveBlending} // Additive for energy look
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

export default AshEffect;
