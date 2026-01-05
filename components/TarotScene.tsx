import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Text, PerspectiveCamera } from '@react-three/drei';
import CosmicBackground from './CosmicBackground';
import * as THREE from 'three';
import TarotCard from './TarotCard';
import WaterOrb from './WaterOrb';
import AshEffect from './AshEffect';
import { getCardColors, OrbColors, DEFAULT_ORB_COLORS } from '../utils/colorMapping';
import { TarotCardData, CardOrientation, GestureType, HandData } from '../types';
import * as i18n from '../i18n';
import { Language } from '../services/geminiService';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface TarotSceneProps {
  handData: HandData;
  onCardDrawn: (card: TarotCardData, orientation: CardOrientation) => void;
  deckPool: TarotCardData[];
  language: Language;
  soundEnabled?: boolean;
  drawnCount: number;
  drawnCards: { card: TarotCardData, orientation: CardOrientation }[];
}

enum SceneState {
  BROWSING,   // 张开手浏览
  GRABBING,   // 捏合抓住卡牌
  LIFTING,    // 向上提抽牌中
  FLIPPING,   // 翻转卡牌展示
  ASHES,      // 灰烬效果
  TRANSITION  // 过场动画
}

const InteractiveContent: React.FC<TarotSceneProps> = ({ handData, onCardDrawn, deckPool, language, soundEnabled = true, drawnCount, drawnCards }) => {
  const { viewport } = useThree();
  const sounds = useSoundEffects(soundEnabled);
  const [sceneState, setSceneState] = useState<SceneState>(SceneState.BROWSING);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [orientation, setOrientation] = useState<CardOrientation>(CardOrientation.UPRIGHT);
  const [showAshes, setShowAshes] = useState(false);
  const [ashKey, setAshKey] = useState(0);
  const [liftProgress, setLiftProgress] = useState(0);
  const [cardsOpacity, setCardsOpacity] = useState(1);
  const [othersOpacity, setOthersOpacity] = useState(1); // 其他卡牌的透明度
  const [flipProgress, setFlipProgress] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [selectedCardPosition, setSelectedCardPosition] = useState<[number, number, number]>([0, 0, 0]);
  const centerCardPositionRef = useRef<[number, number, number]>([0, 0.3, 0]); // 实时追踪中心卡牌位置

  const scrollSpeed = useRef(0);
  const cursorPos = useRef(new THREE.Vector3());
  const targetCursorPos = useRef(new THREE.Vector3());
  const grabStartY = useRef(0);


  const totalCards = deckPool.length;
  const cardSpacing = 3.2;
  const visibleCards = 7;

  // Calculate Target Orb Colors
  const orbColors = useMemo(() => {
    if (drawnCards.length === 0) return DEFAULT_ORB_COLORS;
    // Use the color of the MOST RECENTLY drawn card
    const lastCard = drawnCards[drawnCards.length - 1];
    return getCardColors(lastCard.card.id);
  }, [drawnCards]);

  // 计算当前中心卡牌索引
  const centerCardIndex = useMemo(() => {
    if (totalCards === 0) return -1;
    let idx = Math.round(scrollOffset / cardSpacing) % totalCards;
    if (idx < 0) idx += totalCards;
    return idx;
  }, [scrollOffset, totalCards, cardSpacing]);

  const liftThreshold = 0.1; // 更低的阈值，只需轻微上提即可抽出

  useFrame((state, delta) => {
    // 更新光标位置 - 使用缓存的对象避免每帧 GC
    const targetX = (handData.x - 0.5) * viewport.width;
    const targetY = (0.5 - handData.y) * viewport.height;
    targetCursorPos.current.set(targetX, targetY, 0);
    cursorPos.current.lerp(targetCursorPos.current, 0.25);

    // 非 BROWSING 状态或没有检测到手势时，应用强摩擦力让卡片缓慢停止
    if (sceneState !== SceneState.BROWSING || handData.gesture === GestureType.NONE) {
      scrollSpeed.current *= 0.92; // 强摩擦力，快速停止
      // 只有当速度还有值时才更新偏移
      if (Math.abs(scrollSpeed.current) > 0.01) {
        setScrollOffset(prev => prev + scrollSpeed.current * delta);
      }
    }

    if (sceneState === SceneState.BROWSING && totalCards > 0 && handData.gesture !== GestureType.NONE) {
      // 张开手浏览 - 只有检测到手势时才控制滚动
      const deadZone = 0.1;

      if (handData.x < 0.5 - deadZone) {
        const intensity = (0.5 - deadZone - handData.x) / (0.5 - deadZone);
        scrollSpeed.current = -intensity * 18; // Increased speed
      } else if (handData.x > 0.5 + deadZone) {
        const intensity = (handData.x - 0.5 - deadZone) / (0.5 - deadZone);
        scrollSpeed.current = intensity * 18; // Increased speed
      } else {
        scrollSpeed.current *= 0.90; // Slightly less friction for smoother feel
      }

      setScrollOffset(prev => prev + scrollSpeed.current * delta);

      // ... existing grab logic ...
      // 捏合 → 抓住卡牌
      if (handData.gesture === GestureType.PINCH && centerCardIndex >= 0) {
        // Find the card mostly centered
        const exactIndex = scrollOffset / cardSpacing;
        const roundedIndex = Math.round(exactIndex);
        let cardIdx = roundedIndex % totalCards;
        if (cardIdx < 0) cardIdx += totalCards;

        const card = deckPool[cardIdx];
        if (card) {
          setSelectedCard(card);
          setOrientation(Math.random() < 0.5 ? CardOrientation.UPRIGHT : CardOrientation.REVERSED);
          grabStartY.current = handData.y;
          setLiftProgress(0);
          setSceneState(SceneState.GRABBING);
          scrollSpeed.current = 0;
          sounds.playGrabSound();
        }
      }
    }
    else if (sceneState === SceneState.GRABBING) {
      // 松开手 → 取消
      if (handData.gesture === GestureType.OPEN || handData.gesture === GestureType.NONE) {
        setSelectedCard(null);
        setLiftProgress(0);
        setSceneState(SceneState.BROWSING);
      }
      // 保持捏合并向上移动 → 抽牌
      else if (handData.gesture === GestureType.PINCH) {
        const liftAmount = Math.max(0, grabStartY.current - handData.y);

        // 视觉上跟随上提
        setLiftProgress(liftAmount * 3.5);

        // 达到阈值 → 立即触发抽牌
        if (liftAmount >= liftThreshold) {
          setSceneState(SceneState.LIFTING);
          sounds.playDrawSound(); // 播放抽牌音效
        }
      }
    }

    // Visual Fill Progress Animation（合并到主 useFrame）
    if (sceneState === SceneState.ASHES) {
      const speed = 0.8;
      if (visualFillLevelRef.current < drawnCount) {
        visualFillLevelRef.current = Math.min(visualFillLevelRef.current + speed * delta, drawnCount);
        setVisualFillLevel(visualFillLevelRef.current);
      }
    } else if (drawnCount === 0 && visualFillLevelRef.current !== 0) {
      visualFillLevelRef.current = 0;
      setVisualFillLevel(0);
    }
  });

  // 处理确认抽牌
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (sceneState === SceneState.LIFTING && selectedCard && !isProcessingRef.current) {
      isProcessingRef.current = true;

      // 立即触发，开始翻转动画
      onCardDrawn(selectedCard, orientation);
      sounds.playFlipSound();
      setSceneState(SceneState.FLIPPING);
      setFlipProgress(0);
      setOthersOpacity(1); // 重置其他卡牌透明度
    }
  }, [sceneState, selectedCard, orientation, onCardDrawn, sounds]);

  // 翻转动画状态机
  useEffect(() => {
    if (sceneState === SceneState.FLIPPING) {
      const flipDuration = 800;
      const othersFadeDuration = 600; // 其他卡牌消失时间
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / flipDuration, 1);
        setFlipProgress(progress);

        // 其他卡牌渐渐消失
        const othersProgress = Math.min(elapsed / othersFadeDuration, 1);
        setOthersOpacity(1 - othersProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // 翻转完成，让用户看清卡牌 1 秒，然后开始灰烬效果
          setTimeout(() => {
            // 记录卡牌当前位置用于灰烬效果
            setSelectedCardPosition([...centerCardPositionRef.current]);
            setAshKey(prev => prev + 1);
            setShowAshes(true);
            sounds.playBurnSound();
            setCardsOpacity(0);
            setSceneState(SceneState.ASHES);
          }, 1000);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [sceneState, sounds]);

  // 灰烬效果完成后的过场动画
  useEffect(() => {
    if (sceneState === SceneState.ASHES) {
      // 灰烬效果持续 1.2 秒 (配合 AshEffect 加速)
      setTimeout(() => {
        setShowAshes(false);
        setSceneState(SceneState.TRANSITION);
        setTransitionProgress(0);
        setOthersOpacity(0); // 准备让其他卡牌淡入
      }, 1200);
    }
  }, [sceneState]);

  // Visual Fill Progress Animation - 使用 ref 避免每帧 setState
  const visualFillLevelRef = useRef(0);
  const [visualFillLevel, setVisualFillLevel] = useState(0);

  // 合并到主 useFrame 中的填充逻辑在下面的 useFrame 中处理

  // 过场动画：卡牌从远处飞入
  useEffect(() => {
    if (sceneState === SceneState.TRANSITION) {
      const duration = 800;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setTransitionProgress(eased);
        setCardsOpacity(eased); // 选中卡牌逐渐淡入
        setOthersOpacity(eased); // 其他卡牌逐渐淡入

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // 过场完成，恢复到浏览状态
          setSelectedCard(null);
          setLiftProgress(0);
          setFlipProgress(0);
          setTransitionProgress(0);
          setOthersOpacity(1);
          setSceneState(SceneState.BROWSING);
          isProcessingRef.current = false;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [sceneState]);

  // 生成可见卡牌
  const renderCards = () => {
    if (totalCards === 0) return null;

    const halfVisible = Math.floor(visibleCards / 2);

    // Precise continuous alignment logic
    const exactIndex = scrollOffset / cardSpacing;
    const roundedIndex = Math.round(exactIndex);
    const offsetFromCenter = (exactIndex - roundedIndex) * cardSpacing;

    const cards = [];

    for (let i = -halfVisible; i <= halfVisible; i++) {
      // Calculate actual card index (wrapping)
      let cardIdx = (roundedIndex + i) % totalCards;
      if (cardIdx < 0) cardIdx += totalCards;

      const card = deckPool[cardIdx];
      if (!card) continue;

      // Position relative to center: 
      // i=0 corresponds to the card at roundedIndex.
      // Its visual position is shifted by offsetFromCenter to maintain continuity.
      const xPos = i * cardSpacing - offsetFromCenter;

      // 根据位置计算深度和缩放
      const distFromCenter = Math.abs(xPos);
      const maxDist = halfVisible * cardSpacing;
      const normalizedDist = Math.min(distFromCenter / maxDist, 1);

      const zPos = -normalizedDist * 3; // 远离中心的牌推向后方
      const scale = 1; // 暂时禁用缩放差异以测试性能

      // Improve opacity logic to be less harsh
      const cardOpacity = 1 - Math.pow(normalizedDist, 1.5) * 0.8;

      let yOffset = 0;
      // Use i===0 for determining the lift candidate, as roundedIndex is the center
      if (i === 0 && (sceneState === SceneState.GRABBING || sceneState === SceneState.LIFTING || sceneState === SceneState.FLIPPING)) {
        yOffset = liftProgress;
      }
      const yPos = 0 + yOffset; // 暂时禁用中心上抬以测试性能

      const isCenterCard = i === 0;

      // 更新中心卡牌位置 ref（用于灰烬效果定位）
      if (isCenterCard) {
        centerCardPositionRef.current = [xPos, yPos, zPos];
      }

      // 计算卡牌旋转 - 翻转动画
      let cardRotationY = Math.PI; // 默认背面朝向相机
      if (isCenterCard && sceneState === SceneState.FLIPPING) {
        // 使用 easeInOutCubic 缓动函数让翻转更自然
        const eased = flipProgress < 0.5
          ? 4 * flipProgress * flipProgress * flipProgress
          : 1 - Math.pow(-2 * flipProgress + 2, 3) / 2;
        cardRotationY = Math.PI * (1 - eased); // 从 PI (背面) 翻转到 0 (正面)
      }

      // 计算卡牌透明度
      let finalOpacity = cardOpacity;
      if (isCenterCard) {
        // 选中的卡牌：在翻转和展示时保持可见，灰烬开始时隐藏
        finalOpacity = cardOpacity * cardsOpacity;
      } else {
        // 其他卡牌：在翻转时渐隐，过场时渐入
        if (sceneState === SceneState.FLIPPING || sceneState === SceneState.ASHES) {
          finalOpacity = cardOpacity * othersOpacity;
        } else if (sceneState === SceneState.TRANSITION) {
          finalOpacity = cardOpacity * othersOpacity;
        } else if (sceneState === SceneState.GRABBING) {
          finalOpacity = 0.3 * othersOpacity;
        } else {
          finalOpacity = cardOpacity * othersOpacity;
        }
      }

      cards.push(
        <group
          key={card.id}
          position={[
            xPos,
            yPos,
            sceneState === SceneState.TRANSITION
              ? zPos - 10 * (1 - transitionProgress)
              : zPos
          ]}
          scale={[scale, scale, scale]}
        >
          <TarotCard
            data={card}
            orientation={CardOrientation.UPRIGHT}
            position={[0, 0, 0]}
            rotation={[0, cardRotationY, 0]}
            isHovered={isCenterCard}
            isGrabbed={isCenterCard && (sceneState === SceneState.GRABBING || sceneState === SceneState.LIFTING)}
            opacity={finalOpacity}
            shouldLoadFace={isCenterCard && (sceneState === SceneState.GRABBING || sceneState === SceneState.LIFTING || sceneState === SceneState.FLIPPING)}
          />
        </group>
      );
    }
    return cards;
  };

  const getHintText = () => {
    const t = i18n.t(language);
    switch (sceneState) {
      case SceneState.BROWSING:
        return i18n.t(language).hints.open + " • " + i18n.t(language).hints.pinch;
      case SceneState.GRABBING:
        return i18n.t(language).hints.lift;
      case SceneState.LIFTING:
        return language === 'zh' ? "抽牌中..." : "Drawing card...";
      case SceneState.ASHES:
        return language === 'zh' ? "解读星象中..." : "Reading the cards...";
      default:
        return "";
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 8]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 20, 10]} angle={0.2} penumbra={1} intensity={1.5} color="#4455ff" />

      <CosmicBackground />
      {/* 移除 Environment preset="night" 以使用自定义的星云背景色调 */}

      {/* Progress Orb */}
      <WaterOrb fillLevel={visualFillLevel} colors={orbColors} />

      {/* 手势光标 */}
      <mesh position={cursorPos.current}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={
            handData.gesture === GestureType.PINCH ? "#00ff88" :
              handData.gesture === GestureType.FIST ? "#ff4400" :
                handData.gesture === GestureType.POINT ? "#00ccff" : "#ffffff"
          }
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* 卡牌轮盘 - 不再隐藏，使用透明度过渡 */}
      <group position={[0, 0, 0]}>
        {renderCards()}
      </group>

      {/* 提示文字 */}
      <Text
        position={[0, -4, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
      >
        {getHintText()}
      </Text>

      {/* 选中卡牌名称 - Removed to prevent spoilers */}
      {/* {selectedCard && sceneState === SceneState.GRABBING && (
        <Text
          position={[0, 3.5, 0]}
          fontSize={0.4}
          color="#a855f7"
          anchorX="center"
        >
          {selectedCard.name}
        </Text>
      )} */}

      {/* 灰烬效果 - 在选中卡牌的位置 */}
      {showAshes && (
        <AshEffect
          key={ashKey}
          position={[
            selectedCardPosition[0],
            selectedCardPosition[1], // 已经在 centerCardPositionRef 中包含 liftProgress
            selectedCardPosition[2]
          ]}
          textureUrl={selectedCard?.image}
          onComplete={() => { }}
          targetPosition={[0, 3.5, 0]} // Target the "Cards Drawn" HUD at the top
        />
      )}
    </>
  );
};

const TarotScene: React.FC<TarotSceneProps> = (props) => {
  return (
    <div className="w-full h-full cursor-none">
      <Canvas
        shadows
        gl={{
          antialias: true,
          powerPreference: 'high-performance'
        }}
        dpr={1.5} // 平衡画质和性能
      >
        <InteractiveContent {...props} />
      </Canvas>
    </div>
  );
};

export default TarotScene;
