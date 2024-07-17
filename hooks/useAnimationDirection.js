import { createContext, useContext, useState } from 'react';

const AnimationDirectionContext = createContext();

export const AnimationDirectionProvider = ({ children }) => {
  const [direction, setDirection] = useState('right');
  return (
    <AnimationDirectionContext.Provider value={{ direction, setDirection }}>
      {children}
    </AnimationDirectionContext.Provider>
  );
};

export const useAnimationDirection = () => {
  const context = useContext(AnimationDirectionContext);
  if (context === undefined) {
    throw new Error('useAnimationDirection must be used within an AnimationDirectionProvider');
  }
  return context;
};
