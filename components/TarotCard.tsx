
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TarotCardData, CardOrientation } from '../types';
import { CARD_BACK_URL } from '../constants';

// 全局背面纹理缓存 - 所有卡牌共用一个实例
let sharedBackTexture: THREE.Texture | null = null;
let backTexturePromise: Promise<THREE.Texture> | null = null;

// 正面纹理缓存
const faceTextureCache = new Map<string, THREE.Texture>();
const faceLoadingPromises = new Map<string, Promise<THREE.Texture>>();

// 加载背面纹理（单例）
const loadBackTexture = (): Promise<THREE.Texture> => {
  if (sharedBackTexture) {
    return Promise.resolve(sharedBackTexture);
  }
  if (backTexturePromise) {
    return backTexturePromise;
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  backTexturePromise = new Promise<THREE.Texture>((resolve) => {
    loader.load(
      CARD_BACK_URL,
      (tex) => {
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
        sharedBackTexture = tex;
        resolve(tex);
      },
      undefined,
      () => {
        console.warn('Failed to load back texture');
        resolve(new THREE.Texture());
      }
    );
  });

  return backTexturePromise;
};

// 加载正面纹理（按需）
const loadFaceTexture = (url: string): Promise<THREE.Texture> => {
  if (faceTextureCache.has(url)) {
    return Promise.resolve(faceTextureCache.get(url)!);
  }
  if (faceLoadingPromises.has(url)) {
    return faceLoadingPromises.get(url)!;
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const promise = new Promise<THREE.Texture>((resolve) => {
    loader.load(
      url,
      (tex) => {
        faceTextureCache.set(url, tex);
        faceLoadingPromises.delete(url);
        resolve(tex);
      },
      undefined,
      () => {
        console.warn(`Failed to load face texture: ${url}`);
        faceLoadingPromises.delete(url);
        resolve(new THREE.Texture());
      }
    );
  });

  faceLoadingPromises.set(url, promise);
  return promise;
};

interface TarotCardProps {
  data: TarotCardData;
  orientation: CardOrientation;
  position: [number, number, number];
  rotation: [number, number, number];
  isHovered?: boolean;
  isGrabbed?: boolean;
  opacity?: number;
  shouldLoadFace?: boolean; // 新增：是否应该加载正面纹理
}

const TarotCard: React.FC<TarotCardProps> = ({
  data,
  orientation,
  position,
  rotation,
  isHovered = false,
  isGrabbed = false,
  opacity = 1,
  shouldLoadFace = false
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);
  const [faceTexture, setFaceTexture] = useState<THREE.Texture | null>(null);

  // 缓存用于 lerp/slerp 的目标对象
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const targetEuler = useMemo(() => new THREE.Euler(), []);
  const hoverScale = useMemo(() => new THREE.Vector3(1.1, 1.1, 1.1), []);
  const normalScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  // 发光相关
  const glowColor = useMemo(() => new THREE.Color('#ffd700'), []);
  const glowEmissive = useMemo(() => new THREE.Color('#ffd700'), []);

  // 占位纹理
  const placeholderTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 430;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 430);
      grad.addColorStop(0, '#2d1b4d');
      grad.addColorStop(1, '#1a0b2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 430);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // 加载背面纹理（立即）
  useEffect(() => {
    loadBackTexture().then(setBackTexture);
  }, []);

  // 懒加载正面纹理（当 shouldLoadFace 变为 true 时）
  useEffect(() => {
    if (shouldLoadFace && !faceTexture) {
      loadFaceTexture(data.image).then(setFaceTexture);
    }
  }, [shouldLoadFace, data.image, faceTexture]);

  // Refs for materials
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const frontMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const backMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const edgeMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  // 发光强度
  const glowIntensityRef = useRef(0);
  const lastGrabbedRef = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Position lerp
    targetPosition.set(position[0], position[1], position[2]);
    meshRef.current.position.lerp(targetPosition, 0.2);

    // Rotation slerp
    targetEuler.set(rotation[0], rotation[1], rotation[2]);
    targetQuaternion.setFromEuler(targetEuler);
    meshRef.current.quaternion.slerp(targetQuaternion, 0.2);

    // 发光效果
    if (isGrabbed) {
      glowIntensityRef.current = Math.min(0.8, glowIntensityRef.current + delta * 0.5);
      lastGrabbedRef.current = true;
    } else {
      if (lastGrabbedRef.current && glowIntensityRef.current > 0) {
        glowIntensityRef.current = Math.max(0, glowIntensityRef.current - delta * 2.5);
        if (glowIntensityRef.current <= 0.01) {
          glowIntensityRef.current = 0;
          lastGrabbedRef.current = false;
        }
      }
    }

    // 更新发光材质（合并到同一个 useFrame）
    const glow = glowIntensityRef.current;

    if (glowMeshRef.current) {
      const material = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = glow * 0.5;
      glowMeshRef.current.visible = glow > 0.01;
    }

    if (frontMaterialRef.current) {
      frontMaterialRef.current.emissiveIntensity = glow * 0.4;
    }
    if (backMaterialRef.current) {
      backMaterialRef.current.emissiveIntensity = glow * 0.3;
    }
    if (edgeMaterialRef.current) {
      edgeMaterialRef.current.emissiveIntensity = glow * 0.2;
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* 发光边缘层 */}
      <mesh ref={glowMeshRef} position={[0, 0, -0.02]} visible={false}>
        <planeGeometry args={[2.7, 4.5]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front Face - 使用懒加载的正面纹理或占位符 */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[2.5, 4.3]} />
        <meshStandardMaterial
          ref={frontMaterialRef}
          map={faceTexture || placeholderTexture}
          transparent
          opacity={opacity}
          side={THREE.FrontSide}
          emissive={glowEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Back Face - 使用共享的背面纹理 */}
      <mesh position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.5, 4.3]} />
        <meshStandardMaterial
          ref={backMaterialRef}
          map={backTexture || placeholderTexture}
          transparent
          opacity={opacity}
          side={THREE.FrontSide}
          color="white"
          emissive={glowEmissive}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Card Body (Edge) */}
      <mesh>
        <boxGeometry args={[2.5, 4.3, 0.028]} />
        <meshStandardMaterial
          ref={edgeMaterialRef}
          color="#1a1a1a"
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={opacity}
          emissive={glowEmissive}
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
};

export default TarotCard;
