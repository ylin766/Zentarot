
import { GestureType, HandData } from '../types';

// Declare types for MediaPipe Global variables loaded in index.html
declare const Hands: any;
declare const Camera: any;

export class GestureService {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement, onResults: (results: any) => void) {
    this.videoElement = videoElement;
    this.hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    this.hands.onResults(onResults);

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 640,
      height: 480
    });
  }

  public async start() {
    await this.camera.start();
  }

  public stop() {
    this.camera.stop();
  }

  public static processLandmarks(landmarks: any[]): HandData {
    if (!landmarks || landmarks.length === 0) {
      return { gesture: GestureType.NONE, x: 0.5, y: 0.5, z: 0 };
    }

    const lm = landmarks;
    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];

    // Distances from wrist to determine folded state
    const dThumb = Math.sqrt(Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2));
    const dIndex = Math.sqrt(Math.pow(indexTip.x - wrist.x, 2) + Math.pow(indexTip.y - wrist.y, 2));
    const dMiddle = Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2));
    const dRing = Math.sqrt(Math.pow(ringTip.x - wrist.x, 2) + Math.pow(ringTip.y - wrist.y, 2));
    const dPinky = Math.sqrt(Math.pow(pinkyTip.x - wrist.x, 2) + Math.pow(pinkyTip.y - wrist.y, 2));

    // Pinch distance
    const pinchDist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));

    let gesture = GestureType.NONE;

    // 判断手指是否伸展（距离手腕足够远）
    const thumbExtended = dThumb > 0.12;
    const indexExtended = dIndex > 0.25;
    const middleExtended = dMiddle > 0.25;
    const ringExtended = dRing > 0.2;
    const pinkyExtended = dPinky > 0.18;

    // 计算伸展手指数量
    const extendedFingers = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // FIST: 所有手指都收起（首先检测，优先级最高）
    // 使用更宽松的阈值，并且要求大部分手指都收起
    if (extendedFingers <= 1 && dIndex < 0.22 && dMiddle < 0.22 && dRing < 0.2) {
      gesture = GestureType.FIST;
    }
    // PINCH: 拇指和食指捏合，但其他手指至少有一个伸展
    // 这样可以区分捏合和握拳
    else if (pinchDist < 0.06 && (middleExtended || ringExtended)) {
      gesture = GestureType.PINCH;
    }
    // POINT: 只有食指伸出
    else if (indexExtended && !middleExtended && !ringExtended) {
      gesture = GestureType.POINT;
    }
    // OPEN: 大部分手指伸展
    else if (extendedFingers >= 3) {
      gesture = GestureType.OPEN;
    }

    return {
      gesture,
      x: 1 - indexTip.x, // Flip for mirroring
      y: indexTip.y,
      z: indexTip.z
    };
  }
}
