import React, { createContext, useState, useContext } from 'react';

const CollectionContext = createContext();

export const CollectionProvider = ({ children }) => {
  const [collectionDirection, setCollectionDirection] = useState('right');

  return (
    <CollectionContext.Provider value={{ collectionDirection, setCollectionDirection }}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => useContext(CollectionContext);