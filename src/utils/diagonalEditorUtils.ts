// 定数
export const BASE_LETTER_SP = 0.1; // フォントサイズの割合
export const MAX_EXTRA_SP = 0.14;   // フォントサイズの割合
export const LINE_GAP = 10;
export const BORDER_WIDTH = 1;
export const TOP_MARGIN_VALUE = 10; // 上部マージン値
export const MARGIN = 20; // 左右下のマージン値
export const TOP_MARGIN = TOP_MARGIN_VALUE + 40 + 20; // 上部マージン + GUIバー高さ(40) + 上下パディング(10px+10px)

// 角度に基づく文字間隔の計算
export function getLetterSpacing(angle: number, fontSize: number = 16): number {
  const theta = (angle * Math.PI) / 180;
  const factor = Math.sin(theta * 2);
  return (BASE_LETTER_SP + MAX_EXTRA_SP * factor) * fontSize;
}

// キャンバスの寸法を計算
export function getCanvasDimensions(windowWidth: number, windowHeight: number) {
  const width = windowWidth - MARGIN * 2 - BORDER_WIDTH * 2;
  const height = windowHeight - TOP_MARGIN - MARGIN - BORDER_WIDTH * 2;
  return { width, height };
} 