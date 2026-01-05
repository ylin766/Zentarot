
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 单个流星组件（对象池模式）
const SingleStar = ({ index }: { index: number }) => {
    const mesh = useRef<THREE.Mesh>(null!);

    // 状态 Ref
    const state = useRef({
        active: false,
        startTime: 0,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        delay: Math.random() * 3000,
        duration: 1.0,
        colorType: 0, // 0: White/Purple, 1: Gold
    });

    // 材质
    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color() },
            uTailColor: { value: new THREE.Color() },
            uOpacity: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform vec3 uTailColor;
            uniform float uOpacity;
            varying vec2 vUv;
            void main() {
                // 1. 横向光晕 (模拟光束/圆柱感)
                // center = 0.5. dist from center:
                float dist = abs(vUv.x - 0.5) * 2.0; 
                float sideGlow = pow(1.0 - dist, 3.0); // 核心亮，边缘快速衰减
                
                // 2. 纵向拖尾 (头部亮，尾部拖长)
                // 使用非线性衰减，让尾部更自然
                float tailFade = smoothstep(0.0, 0.3, vUv.y); // 尾部最后30%渐隐
                
                // 3. 头部高亮 (Head Burst)
                float head = smoothstep(0.95, 1.0, vUv.y);
                
                // 组合 Alpha
                float alpha = sideGlow * tailFade * uOpacity;
                
                // 颜色混合
                vec3 baseColor = mix(uTailColor, uColor, vUv.y);
                
                // 头部叠加纯白高亮
                vec3 finalColor = mix(baseColor, vec3(1.0, 1.0, 1.0), head * 0.8);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    }), []);

    const reset = () => {
        const s = state.current;
        s.active = false;
        s.delay = 500 + Math.random() * 2000; // 更快触发
        if (mesh.current) mesh.current.visible = false;
    };

    const activate = () => {
        const s = state.current;
        s.active = true;
        s.startTime = Date.now();

        // 随机位置：更广阔的分布
        s.startPos.set(
            (Math.random() - 0.5) * 80,
            20 + Math.random() * 30,
            -30 - Math.random() * 20
        );

        // 随机颜色类型：20% 概率出现金色流星
        s.colorType = Math.random() > 0.8 ? 1 : 0;
        if (s.colorType === 1) {
            material.uniforms.uColor.value.set('#ffeb3b'); // Bright Gold
            material.uniforms.uTailColor.value.set('#f57f17'); // Orange Tail
        } else {
            material.uniforms.uColor.value.set('#e0e7ff'); // Cyan/White
            material.uniforms.uTailColor.value.set('#7c3aed'); // Purple Tail
        }

        // 短促有力的划痕 -> 更加优雅的长距离滑行
        const travelDist = 20 + Math.random() * 20;
        const angle = Math.PI * 1.2 + (Math.random() - 0.5) * 0.8;

        s.endPos.set(
            s.startPos.x + Math.cos(angle) * travelDist,
            s.startPos.y + Math.sin(angle) * travelDist,
            s.startPos.z
        );

        s.duration = 2.5 + Math.random() * 2.0; // 2.5s - 4.5s (更慢更优雅)

        mesh.current.position.copy(s.startPos);
        const direction = new THREE.Vector3().subVectors(s.endPos, s.startPos).normalize();
        mesh.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        mesh.current.visible = true;
    };

    useFrame((_, delta) => {
        if (!mesh.current) return;
        const s = state.current;

        if (!s.active) {
            s.delay -= delta * 1000;
            if (s.delay <= 0) activate();
            return;
        }

        const elapsed = (Date.now() - s.startTime) / 1000;
        const progress = elapsed / s.duration;

        if (progress >= 1) {
            reset();
            return;
        }

        mesh.current.position.lerpVectors(s.startPos, s.endPos, progress);

        // 精致的透明度曲线：快速亮起，缓慢消失
        // EaseOutQuint for fade out?
        let opacity = 0;
        if (progress < 0.1) {
            opacity = progress / 0.1; // 前10% 快速显现
        } else {
            // 后90% 慢慢变淡
            opacity = 1.0 - Math.pow((progress - 0.1) / 0.9, 2.0);
        }

        material.uniforms.uOpacity.value = opacity * 0.8; // Max opacity 0.8 specifically
    });

    return (
        <mesh ref={mesh} visible={false}>
            {/* 极细的宽度 0.04 -> 0.3 以适配 soft edge shader */}
            <planeGeometry args={[0.3, 4.0]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
};

export const ShootingStarsManager: React.FC = () => {
    // 减少数量以优化性能
    const stars = useMemo(() => new Array(3).fill(0).map((_, i) => i), []);
    return (
        <group>
            {stars.map(i => (
                <SingleStar key={i} index={i} />
            ))}
        </group>
    );
}
