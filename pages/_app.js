import "../styles/globals.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { useSwipeable } from 'react-swipeable';

function InnerApp({ Component, pageProps }) {
  const router = useRouter();
  const [direction, setDirection] = useState('');
  const [pageKey, setPageKey] = useState(router.pathname);

  const handleRouteChangeStart = useCallback((url) => {
    const isCurrentCollection = router.pathname.includes("/collection/");
    const isNextCollection = url.includes("/collection/");
    const isCollectionToCollection = isCurrentCollection && isNextCollection;

    // Only set the page key on route change start
    if (isCollectionToCollection) {
      setPageKey(url);
    }
  }, [router.pathname]);

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [handleRouteChangeStart]);

  const handleAreaClick = useCallback((area) => {
    const nextSlug = pageProps.nextSlug;
    const prevSlug = pageProps.prevSlug;

    if (area === 'down' && nextSlug) {
      setDirection('down');
      router.push(`/collection/${nextSlug}`);
    } else if (area === 'up' && prevSlug) {
      setDirection('up');
      router.push(`/collection/${prevSlug}`);
    }
  }, [pageProps.nextSlug, pageProps.prevSlug, router]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowDown') {
        handleAreaClick('down');
      } else if (event.key === 'ArrowUp') {
        handleAreaClick('up');
      }
    },
    [handleAreaClick]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => handleAreaClick('down'),
    onSwipedDown: () => handleAreaClick('up'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const pageVariants = {
    initial: (direction) => ({
      opacity: 0,
      y: direction === 'up' ? '-80%' : direction === 'down' ? '80%' : 0,
    }),
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 25,
        duration: 0.7,
      },
    },
    exit: (direction) => ({
      opacity: 0,
      y: direction === 'up' ? '80%' : direction === 'down' ? '-80%' : 0,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 25,
        duration: 0.7,
      },
    }),
  };

  return (
    <>
      {router.pathname.includes("/collection/") && (
        <>
          <div
            id="click-up"
            className="absolute left-0 top-0 h-1/6 w-full cursor-pointer clickable-area"
            onClick={() => handleAreaClick('up')}
            style={{ zIndex: 10 }}
          />
          <div
            id="click-down"
            className="absolute left-0 bottom-14 h-1/6 w-full cursor-pointer clickable-area"
            onClick={() => handleAreaClick('down')}
            style={{ zIndex: 10 }}
          />
        </>
      )}
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={pageKey}
          initial="initial"
          animate="animate"
          exit="exit"
          custom={direction}
          variants={pageVariants}
          style={{ position: 'relative' }}
          className="h-screen"
          {...swipeHandlers} // Add swipe handlers
        >
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <InnerApp Component={Component} pageProps={pageProps} />
      <Navigation />
    </>
  );
}

export default MyApp;