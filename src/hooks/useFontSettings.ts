import { useState, useEffect } from 'react';

export type FontType = 'default' | 'handwriting';

// ローカルストレージのキー
const STORAGE_FONT_TYPE_KEY = 'fontType';
const STORAGE_FONT_SIZE_KEY = 'fontSize';
const STORAGE_ANGLE_KEY = 'angle';

interface FontSettings {
  fontType: FontType;
  setFontType: (type: FontType) => void;
  fontFamily: string;
  fontSize: number;
  setFontSize: (size: number) => void;
  angle: number;
  setAngle: (angle: number) => void;
}

export function useFontSettings(): FontSettings {
  // 初期値を明示的に設定せず、設定された時のみ状態を更新
  const [fontType, setFontType] = useState<FontType>('handwriting');
  const [fontSize, setFontSize] = useState<number>(18);
  const [angle, setAngle] = useState<number>(() => {
    // 初期化時に一度だけローカルストレージから読み込む
    const savedAngle = localStorage.getItem(STORAGE_ANGLE_KEY);
    // 古いキーが存在する場合は移行する
    const oldSavedAngle = localStorage.getItem('diagonal-editor-angle');
    
    // 古いキーを削除
    if (oldSavedAngle) {
      console.log('古い角度設定を移行します:', oldSavedAngle);
      localStorage.removeItem('diagonal-editor-angle');
      
      // 新しいキーがない場合は古いキーの値を使用
      if (!savedAngle) {
        localStorage.setItem(STORAGE_ANGLE_KEY, oldSavedAngle);
        return Number(oldSavedAngle);
      }
    }
    
    if (savedAngle) {
      return Number(savedAngle);
    }
    return 8; // デフォルト値
  });

  // ローカルストレージからフォント設定を読み込む
  useEffect(() => {
    console.log('ローカルストレージから設定を読み込みます');
    
    const savedFontType = localStorage.getItem(STORAGE_FONT_TYPE_KEY) as FontType;
    console.log('保存されたフォントタイプ:', savedFontType);
    if (savedFontType) {
      setFontType(savedFontType);
    }

    const savedFontSize = localStorage.getItem(STORAGE_FONT_SIZE_KEY);
    console.log('保存されたフォントサイズ:', savedFontSize);
    if (savedFontSize) {
      setFontSize(Number(savedFontSize));
    }
  }, []);

  // フォント設定を変更したらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_FONT_TYPE_KEY, fontType);
  }, [fontType]);

  // フォントサイズを変更したらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  // 角度を変更したらローカルストレージに保存
  useEffect(() => {
    console.log('角度を保存します:', angle, 'キー名:', STORAGE_ANGLE_KEY);
    localStorage.setItem(STORAGE_ANGLE_KEY, String(angle));
  }, [angle]);

  // フォントタイプに基づいてフォントファミリーを返す
  const fontFamily = fontType === 'handwriting' 
    ? 'Xiaolai, sans-serif' 
    : 'sans-serif';

  return { fontType, setFontType, fontFamily, fontSize, setFontSize, angle, setAngle };
} 