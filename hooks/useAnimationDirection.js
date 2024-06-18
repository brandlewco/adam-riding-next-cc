import { useState, useEffect } from 'react';

let directionState = 'right';
const subscribers = new Set();

export const useAnimationDirection = () => {
  const [direction, setDirectionState] = useState(directionState);

  useEffect(() => {
    const callback = () => setDirectionState(directionState);
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  const setDirection = (newDirection) => {
    directionState = newDirection;
    subscribers.forEach(callback => callback());
  };

  return {
    direction,
    setDirection,
  };
};
