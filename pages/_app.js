import "../styles/globals.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { useSwipeable } from "react-swipeable";

function InnerApp({ Component, pageProps }) {
  const router = useRouter();
  const [direction, setDirection] = useState('');
  const [pageKey, setPageKey] = useState(router.pathname);

  // Track route changes among /collection/ pages to animate
  const handleRouteChangeStart = useCallback(
    (url) => {
      const isCurrentCollection = router.pathname.includes("/collection/");
      const isNextCollection = url.includes("/collection/");
      const isCollectionToCollection = isCurrentCollection && isNextCollection;

      // If navigating from one collection to another, set new page key
      if (isCollectionToCollection) {
        setPageKey(url);
      }
    },
    [router.pathname]
  );

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [handleRouteChangeStart]);

  // Handle up/down navigation
  const handleAreaClick = useCallback(
    (area) => {
      // Only navigate up/down if on a /collection/ page
      if (!router.pathname.includes("/collection/")) return;

      // Destructure needed props from pageProps
      const { slugArray, currentSlug } = pageProps;
      if (!slugArray || !currentSlug) return; // If missing data, do nothing

      // Find currentIndex within slugArray
      const currentIndex = slugArray.indexOf(currentSlug);
      if (currentIndex === -1) return; // slug not found

      let nextIndex;
      if (area === 'down') {
        nextIndex = (currentIndex + 1) % slugArray.length;
        setDirection('down');
      } else if (area === 'up') {
        nextIndex = (currentIndex - 1 + slugArray.length) % slugArray.length;
        setDirection('up');
      } else {
        return;
      }

      // Grab next slug from the array and route
      const nextSlug = slugArray[nextIndex];
      if (nextSlug) {
        router.push(`/collection/${nextSlug}`);
      }
    },
    [pageProps, router]
  );

  // Keyboard handlers
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Swipe detection
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => handleAreaClick('down'),
    onSwipedDown: () => handleAreaClick('up'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  // Page transition variants for Framer Motion
  const pageVariants = {
    initial: (dir) => ({
      opacity: 0,
      y: dir === 'up' ? '-80%' : dir === 'down' ? '80%' : 0,
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
    exit: (dir) => ({
      opacity: 0,
      y: dir === 'up' ? '80%' : dir === 'down' ? '-80%' : 0,
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
          {/* Clickable area for arrow up */}
          <div
            id="click-up"
            className="absolute left-0 top-0 w-full h-1/6 cursor-pointer clickable-area"
            onClick={() => handleAreaClick('up')}
            style={{ zIndex: 10 }}
          />
          {/* Clickable area for arrow down */}
          <div
            id="click-down"
            className="absolute left-0 bottom-0 w-full h-1/6 cursor-pointer clickable-area"
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
          className="h-screen overflow-hidden"
          {...swipeHandlers}
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
