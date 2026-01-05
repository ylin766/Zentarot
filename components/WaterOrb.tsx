import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbColors, DEFAULT_ORB_COLORS } from '../utils/colorMapping';

interface WaterOrbProps {
    fillLevel: number;
    position?: [number, number, number];
    colors?: OrbColors;
}

const LiquidShader = {
    uniforms: {
        uTime: { value: 0 },
        uFillLevel: { value: -1.0 },
        // Ethereal Galaxy Palette (Dynamic)
        uColorDeep: { value: new THREE.Color(DEFAULT_ORB_COLORS.deep) },
        uColorMid: { value: new THREE.Color(DEFAULT_ORB_COLORS.mid) },
        uColorLight: { value: new THREE.Color(DEFAULT_ORB_COLORS.light) },
        uColorHighlight: { value: new THREE.Color(DEFAULT_ORB_COLORS.highlight) },
        uRimColor: { value: new THREE.Color(DEFAULT_ORB_COLORS.rim) },
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
    fragmentShader: `
    uniform float uTime;
    uniform float uFillLevel;
    uniform vec3 uColorDeep;
    uniform vec3 uColorMid;
    uniform vec3 uColorLight;
    uniform vec3 uColorHighlight;
    uniform vec3 uRimColor;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    // --- Soft Noise ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) { 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0);
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    // Smooth FBM - low frequency dominance
    float smoothFbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.6; 
        float frequency = 0.8;
        for (int i = 0; i < 3; i++) { // Fewer octaves for smoother look
            value += amplitude * snoise(p * frequency);
            p += vec3(0.5); // Shift to avoid artifacts
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        return value;
    }

    void main() {
      float level = uFillLevel;
      
      // Gentle Wave
      float wave = sin(vPosition.x * 2.5 + uTime * 0.5) * 0.02 + cos(vPosition.z * 2.0 + uTime * 0.4) * 0.02;
      
      if (vPosition.y > level + wave) {
        discard;
      }
      
      // -- Ethereal Clouds --
      // Slow, large warping for "Galaxy Dust"
      vec3 coord = vPosition * 1.5 + vec3(0.0, uTime * 0.05, uTime * 0.05);
      float n = smoothFbm(coord); // -1 to 1
      
      // Map noise to smooth 0-1 range
      float cloudVal = n * 0.5 + 0.5;
      
      // Base Gradient: Deep -> Mid
      vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.2, 0.8, cloudVal));
      
      // Accents: Light Purple nebulas in high density areas
      col = mix(col, uColorLight, smoothstep(0.6, 0.9, cloudVal));
      
      // -- Subtle Sparkles (Not spots) --
      // Use extremely high frequency noise, thresholded strictly
      float starNoise = snoise(vPosition * 25.0 + uTime * 0.5);
      float starMask = smoothstep(0.92, 1.0, starNoise);
      // Soften stars with distance
      col += uColorHighlight * starMask * 0.8;
      
      // -- Translucency Simulation --
      // Fresel effect: Edges are lighter/opaque, center is deeper/transparent
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
      
      // Add glowing rim
      col += uRimColor * fresnel * 0.6;
      
      // -- Surface Meniscus -- 
      float surfaceDist = abs(vPosition.y - (level + wave));
      if (surfaceDist < 0.02) {
        col = mix(col, uColorHighlight, 0.5); // Soft white line
      }

      // Alpha: Make it slightly transparent to feel like liquid
      // Lower alpha in the middle (0.85), higher at edges (0.95)
      float alpha = 0.85 + fresnel * 0.15;
      
      gl_FragColor = vec4(col, alpha);
    }
  `
};

const WaterOrb: React.FC<WaterOrbProps> = ({ fillLevel = 0, position = [0, 3.5, 0], colors = DEFAULT_ORB_COLORS }) => {
    const { scene } = useGLTF('/model/water_orb.glb');
    const orbRef = useRef<THREE.Group>(null);

    const clonedScene = useMemo(() => scene.clone(), [scene]);

    // 缓存目标颜色对象，避免每帧创建
    const targetColors = useRef({
        deep: new THREE.Color(colors.deep),
        mid: new THREE.Color(colors.mid),
        light: new THREE.Color(colors.light),
        highlight: new THREE.Color(colors.highlight),
        rim: new THREE.Color(colors.rim)
    });

    // 当 colors prop 变化时更新目标颜色
    useEffect(() => {
        targetColors.current.deep.set(colors.deep);
        targetColors.current.mid.set(colors.mid);
        targetColors.current.light.set(colors.light);
        targetColors.current.highlight.set(colors.highlight);
        targetColors.current.rim.set(colors.rim);
    }, [colors]);

    const liquidMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uFillLevel: { value: -1.0 },
                uColorDeep: { value: new THREE.Color(colors.deep) },
                uColorMid: { value: new THREE.Color(colors.mid) },
                uColorLight: { value: new THREE.Color(colors.light) },
                uColorHighlight: { value: new THREE.Color(colors.highlight) },
                uRimColor: { value: new THREE.Color(colors.rim) }
            },
            vertexShader: LiquidShader.vertexShader,
            fragmentShader: LiquidShader.fragmentShader,
            transparent: true,
            side: THREE.FrontSide
        });
    }, []);

    useEffect(() => {
        clonedScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = liquidMaterial;
            }
        });
    }, [clonedScene, liquidMaterial]);

    useFrame((state, delta) => {
        if (orbRef.current) {
            orbRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.1;
            orbRef.current.rotation.y += delta * 0.2;
        }

        if (liquidMaterial) {
            liquidMaterial.uniforms.uTime.value = state.clock.elapsedTime;
            // Map 0..3 to -1.5..1.1
            const mappedLevel = -1.5 + (fillLevel / 3.0) * 2.6;
            liquidMaterial.uniforms.uFillLevel.value = mappedLevel;

            // Lerp Colors - 使用缓存的目标颜色对象
            liquidMaterial.uniforms.uColorDeep.value.lerp(targetColors.current.deep, delta * 2.0);
            liquidMaterial.uniforms.uColorMid.value.lerp(targetColors.current.mid, delta * 2.0);
            liquidMaterial.uniforms.uColorLight.value.lerp(targetColors.current.light, delta * 2.0);
            liquidMaterial.uniforms.uColorHighlight.value.lerp(targetColors.current.highlight, delta * 2.0);
            liquidMaterial.uniforms.uRimColor.value.lerp(targetColors.current.rim, delta * 2.0);
        }
    });


    return (
        <group position={position} ref={orbRef}>
            <primitive object={clonedScene} scale={[0.45, 0.45, 0.45]} />
            <pointLight
                intensity={0.4 + fillLevel * 0.4}
                distance={4}
                color={colors.rim} // Sync light color with rim for coherence
                decay={2}
            />
        </group>
    );
};

useGLTF.preload('/model/water_orb.glb');

export default WaterOrb;
