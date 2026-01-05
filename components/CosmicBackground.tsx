
import React, { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { ShootingStarsManager } from './ShootingStars';

// 简化版 3D 噪声函数 (用于 JS 端计算星星密度)
const hash = (n: number) => {
    const x = Math.sin(n) * 43758.5453123;
    return x - Math.floor(x);
};

const noise3D = (x: number, y: number, z: number): number => {
    const i = Math.floor(x) + Math.floor(y) * 157 + Math.floor(z) * 113;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const fz = z - Math.floor(z);

    const a = hash(i);
    const b = hash(i + 1);
    const c = hash(i + 157);
    const d = hash(i + 158);
    const e = hash(i + 113);
    const f = hash(i + 114);
    const g = hash(i + 270);
    const h = hash(i + 271);

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const uz = fz * fz * (3 - 2 * fz);

    const k0 = a;
    const k1 = b - a;
    const k2 = c - a;
    const k3 = e - a;
    const k4 = a - b - c + d;
    const k5 = a - c - e + g;
    const k6 = a - b - e + f;
    const k7 = -a + b + c - d + e - f - g + h;

    return k0 + k1 * ux + k2 * uy + k3 * uz + k4 * ux * uy + k5 * uy * uz + k6 * uz * ux + k7 * ux * uy * uz;
};

// 1. NEBULA BACKGROUND COMPONENT
// 使用原生 ShaderMaterial 避免 drei 的辅助函数可能带来的问题
const NebulaBackground = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null!);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        // 多彩星云配色：蓝→紫→粉→金渐变
        uColor1: { value: new THREE.Color('#0a0a1a') }, // 深邃夜空底色
        uColor2: { value: new THREE.Color('#1e1b4b') }, // 靛蓝 (Indigo)
        uColor3: { value: new THREE.Color('#4c1d95') }, // 紫罗兰 (Violet)
        uColor4: { value: new THREE.Color('#be185d') }, // 玫红 (Rose)
        uColor5: { value: new THREE.Color('#0891b2') }, // 青色 (Cyan)
        uAccent: { value: new THREE.Color('#f59e0b') }  // 金色高光 (Amber)
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * 0.05;
        }
    });

    return (
        <group>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[120, 24, 24]} />
                <shaderMaterial
                    ref={materialRef}
                    uniforms={uniforms}
                    side={THREE.BackSide}
                    vertexShader={`
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        void main() {
                            vUv = uv;
                            vPosition = position;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uTime;
                        uniform vec3 uColor1;
                        uniform vec3 uColor2;
                        uniform vec3 uColor3;
                        uniform vec3 uColor4;
                        uniform vec3 uColor5;
                        uniform vec3 uAccent;
                        varying vec2 vUv;
                        varying vec3 vPosition;

                        // 简化版 3D Noise
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

                        // 简化版 FBM
                        float fbm(vec3 p) {
                            return 0.5 * snoise(p) + 0.25 * snoise(p * 2.0 + 100.0);
                        }

                        void main() {
                            vec3 pos = normalize(vPosition);
                            
                            // 轻微旋转
                            float theta = uTime * 0.02;
                            mat2 rot = mat2(cos(theta), sin(theta), -sin(theta), cos(theta));
                            pos.xz = rot * pos.xz;

                            // 轻量级 Domain Warping
                            vec3 q = pos * 1.5;
                            q += vec3(fbm(pos * 2.0), fbm(pos * 2.0 + 10.0), fbm(pos * 2.0 + 20.0)) * 0.3;
                            
                            // 主噪声
                            float n1 = fbm(q + uTime * 0.1);
                            n1 = n1 * 0.5 + 0.5;
                            
                            // 第二层噪声 (用于颜色变化)
                            float n2 = fbm(pos * 3.0 - uTime * 0.05);
                            n2 = n2 * 0.5 + 0.5;

                            // 大幅稀疏化：只在噪声值很高的区域显示云层
                            float cloudMask = smoothstep(0.5, 0.85, n1);
                            
                            // 多彩颜色混合 - 增强版
                            // 基础层：保持深夜空为主
                            vec3 col = uColor1;
                            
                            // 计算色相偏移，让不同区域有不同的主色调
                            float hueShift = sin(pos.x * 2.0 + pos.z * 1.5 + uTime * 0.1) * 0.5 + 0.5;
                            
                            // 云层颜色：根据位置和噪声在多种颜色间过渡
                            vec3 warmColor = mix(uColor4, uAccent, hueShift * 0.5);
                            vec3 coolColor = mix(uColor2, uColor5, n2);
                            vec3 midColor = mix(uColor3, warmColor, hueShift * 0.3);
                            
                            // 根据位置决定冷暖色调
                            float warmCoolMix = sin(pos.y * 3.0 + pos.x * 2.0) * 0.5 + 0.5;
                            vec3 cloudColor = mix(coolColor, midColor, warmCoolMix);
                            
                            // 降低云层混合强度，让底色更多露出
                            col = mix(col, cloudColor, cloudMask * 0.35);
                            
                            // 高亮点缀：更加稀疏
                            float highlightMask = smoothstep(0.7, 0.95, n1) * smoothstep(0.6, 0.9, n2);
                            vec3 highlightColor = mix(uColor4, uAccent, hueShift);
                            col = mix(col, highlightColor, highlightMask * 0.25);
                            
                            // 极少量的明亮核心（几乎不可见）
                            float coreMask = smoothstep(0.9, 0.99, n1 * n2);
                            col += vec3(1.0, 0.9, 0.8) * coreMask * 0.2;

                            // 提高整体亮度
                            col = pow(col, vec3(0.75));
                            col += vec3(0.03, 0.03, 0.05);

                            gl_FragColor = vec4(col, 1.0);
                        }
                    `}
                />
            </mesh>
        </group>
    );

};

// 2. STAR FIELD COMPONENT
const StarField = () => {
    const count = 2000;
    const mesh = useRef<THREE.Points>(null!);

    const [positions, sizes, timeOffsets, colors] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const s = new Float32Array(count);
        const t = new Float32Array(count);
        const c = new Float32Array(count * 3);

        // 星星调色板
        const palette = [
            [1.0, 1.0, 1.0],
            [0.8, 0.85, 1.0],
            [0.9, 0.8, 1.0],
            [1.0, 0.95, 0.8],
            [0.7, 0.9, 1.0],
        ];

        let starIndex = 0;
        const maxAttempts = count * 3; // 防止无限循环
        let attempts = 0;

        while (starIndex < count && attempts < maxAttempts) {
            attempts++;

            // 随机生成位置
            const r = 20 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);

            // 计算该位置的噪声值（与星云一致）
            const noiseVal = noise3D(x * 1.5 + 10, y * 1.5 + 10, z * 1.5 + 10);

            // 根据噪声值决定是否放置星星
            // 噪声值高的地方（星云区域）更容易放置星星，低的地方非常稀疏
            const probability = 0.08 + noiseVal * 0.92; // 8%-100% 概率，对比更强烈

            if (Math.random() < probability) {
                p[starIndex * 3] = r * x;
                p[starIndex * 3 + 1] = r * y;
                p[starIndex * 3 + 2] = r * z;

                // 星云区域的星星稍微大一点
                s[starIndex] = (0.5 + Math.random() * 1.5) * (0.8 + noiseVal * 0.4);
                t[starIndex] = Math.random() * 100;

                // 颜色：星云区域更多彩色星星
                const colorChance = noiseVal > 0.5 ? 0.4 : 0.6; // 星云区 40% 彩色，其他 60% 白色
                const colorIndex = Math.random() < colorChance ? 0 : Math.floor(Math.random() * palette.length);
                const color = palette[colorIndex];
                c[starIndex * 3] = color[0];
                c[starIndex * 3 + 1] = color[1];
                c[starIndex * 3 + 2] = color[2];

                starIndex++;
            }
        }

        return [p, s, t, c];
    }, []);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 }
    }), []);

    useFrame((state) => {
        if (mesh.current) {
            (mesh.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
            mesh.current.rotation.y = state.clock.elapsedTime * 0.01;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-timeOffset" count={count} array={timeOffsets} itemSize={1} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
            </bufferGeometry>
            <shaderMaterial
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexShader={`
                    attribute float size;
                    attribute float timeOffset;
                    attribute vec3 color;
                    varying float vAlpha;
                    varying vec3 vColor;
                    uniform float uTime;
                    void main() {
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        float twinkle = sin(uTime * 2.0 + timeOffset) * 0.5 + 0.5;
                        float currentSize = size * (0.8 + 0.4 * twinkle);
                        gl_PointSize = currentSize * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                        vAlpha = 0.4 + 0.6 * twinkle;
                        vColor = color;
                    }
                `}
                fragmentShader={`
                    varying float vAlpha;
                    varying vec3 vColor;
                    void main() {
                        vec2 center = gl_PointCoord - vec2(0.5);
                        float dist = length(center);
                        if (dist > 0.5) discard;
                        float glow = 1.0 - (dist * 2.0);
                        glow = pow(glow, 1.5);
                        gl_FragColor = vec4(vColor, vAlpha * glow);
                    }
                `}
            />
        </points>
    );
}

// 3. MAIN COMPONENT
const CosmicBackground: React.FC = () => {
    return (
        <group>
            {/* Background Plane */}
            <NebulaBackground />

            {/* Stars Layer */}
            <StarField />

            {/* Dynamic Elements */}
            <ShootingStarsManager />
        </group>
    );
};

export default CosmicBackground;
