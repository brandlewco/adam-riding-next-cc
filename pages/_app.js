import "../styles/globals.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { AnimationDirectionProvider, useAnimationDirection } from '../hooks/AnimationDirectionContext';

function InnerApp({ Component, pageProps }) {
  const router = useRouter();
  const { direction, setDirection } = useAnimationDirection();
  const [pageKey, setPageKey] = useState(router.pathname);
  const [isCollectionTransition, setIsCollectionTransition] = useState(false);

  const handleRouteChangeStart = useCallback((url) => {
    const isCurrentCollection = router.pathname.includes("/collection/");
    const isNextCollection = url.includes("/collection/");
    const isCollectionToCollection = isCurrentCollection && isNextCollection;

    setIsCollectionTransition(isCollectionToCollection);

    if (isCollectionToCollection) {
      console.log(`Direction: ${direction}`);
      console.log(`Current path: ${router.pathname}, Next path: ${url}`);
    } else {
      setDirection(''); // Clear direction for non-collection transitions
      console.log('Non-collection transition');
    }

    setPageKey(url);
  }, [router.pathname, setDirection, direction]);

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [handleRouteChangeStart]);


  const pageVariants = {
    initial: {
      opacity: 0,
      x: direction === 'left' ? '-50%' : direction === 'right' ? '50%' : 0,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
    exit: {
      opacity: 0,
      x: direction === 'left' ? '50%' : direction === 'right' ? '-50%' : 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <AnimationDirectionProvider>
      <InnerApp Component={Component} pageProps={pageProps} />
      <Navigation />
    </AnimationDirectionProvider>
  );
}

export default MyApp;