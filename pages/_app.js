import "../styles/globals.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { AnimationDirectionProvider, useAnimationDirection } from "../hooks/useAnimationDirection";

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
      setDirection(router.pathname < url ? 'right' : 'left');
      console.log(direction)
    } else {
      setDirection(''); // Clear direction for non-collection transitions
      console.log(setDirection)

    }

    setPageKey(url);
  }, [router.pathname, setDirection]);

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [handleRouteChangeStart, router.events]);

  const variants = useMemo(() => ({
    enter: { opacity: 0, x: direction === 'right' ? 500 : direction === 'left' ? -500 : 0 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === 'right' ? -500 : direction === 'left' ? 500 : 0 },
  }), [direction]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="enter"
        animate="center"
        exit="exit"
        custom={direction}
        variants={isCollectionTransition ? variants : {}}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        layoutId={`page-${pageKey}`}  // Ensure consistent layoutId usage
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
