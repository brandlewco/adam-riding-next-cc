import { createContext, useContext, useState } from 'react';

const AnimationDirectionContext = createContext();

export const AnimationDirectionProvider = ({ children }) => {
  const [direction, setDirection] = useState('');

  return (
    <AnimationDirectionContext.Provider value={{ direction, setDirection }}>
      {children}
    </AnimationDirectionContext.Provider>
  );
};

export const useAnimationDirection = () => useContext(AnimationDirectionContext);
