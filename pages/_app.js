import "../styles/globals.css";
import { useEffect, useState, useCallback } from "react";
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

  const handleAreaClick = (area) => {
    const nextSlug = pageProps.nextSlug;
    const prevSlug = pageProps.prevSlug;

    if (area === 'right') {
      setDirection('right');
      router.push(`/collection/${nextSlug}`);
    } else if (area === 'left') {
      setDirection('left');
      router.push(`/collection/${prevSlug}`);
    }
  };

  const pageVariants = {
    initial: {
      opacity: 1,
      x: direction === 'left' ? '-80%' : direction === 'right' ? '80%' : 0,
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
      opacity: 1,
      x: direction === 'left' ? '80%' : direction === 'right' ? '-80%' : 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <>
      {router.pathname.includes("/collection/") && (
        <>
          <div
            id="click-left"
            className="absolute left-0 top-0 h-full w-1/6 cursor-pointer clickable-area"
            onClick={() => handleAreaClick('left')}
            style={{ zIndex: 10 }}
          />
          <div
            id="click-right"
            className="absolute right-0 top-0 h-full w-1/6 cursor-pointer clickable-area"
            onClick={() => handleAreaClick('right')}
            style={{ zIndex: 10 }}
          />
        </>
      )}
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
    </>
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