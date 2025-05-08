import { useState, useEffect } from 'react';
import { WindowSize } from '../types/diagonalEditor';

// ウィンドウサイズ監視用カスタムフック
export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
} 