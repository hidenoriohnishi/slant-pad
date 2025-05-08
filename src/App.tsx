import React from 'react';
import { DiagonalEditor } from './components/DiagonalEditor';
import { useFontSettings } from './hooks/useFontSettings';

const App: React.FC = () => {
  const { fontFamily } = useFontSettings();
  
  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '40px auto', 
      padding: '0 20px',
      fontFamily
    }}>
      <h1>Diagonal Editor</h1>
      <DiagonalEditor />
    </div>
  );
};

export default App; 