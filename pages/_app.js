import "../styles/globals.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { useSwipeable } from "react-swipeable";

function InnerApp({ Component, pageProps }) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [pageKey, setPageKey] = useState(router.pathname);

  const handleRouteChangeStart = useCallback(
    (url) => {
      const isCurrent = router.pathname.includes("/collection/");
      const isNext = url.includes("/collection/");
      if (isCurrent && isNext) {
        // Switch "pageKey" so AnimatePresence triggers exit/enter for collections
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

  useEffect(() => {
    if (router.query.direction) {
      setDirection(router.query.direction);
    } else {
      setDirection("");
    }
  }, [router.query.direction]);

  const swipeHandlers = useSwipeable({});

  // No opacity, just vertical slides. 
  // We'll do a quick linear .3s tween so pages overlap in transition.
  const pageVariants = {
    initial: (dir) => {
      switch (dir) {
        case "down":
          return { y: "-100%" };
        case "up":
          return { y: "100%" };
        default:
          return { y: 0 };
      }
    },
    animate: {
      y: 0,
      transition: {
        type: "tween",
        ease: "linear",
        duration: 0.3,
      },
    },
    exit: (dir) => {
      switch (dir) {
        case "down":
          // old page => 100% (slides down)
          return {
            y: "100%",
            transition: { type: "tween", ease: "linear", duration: 0.3 },
          };
        case "up":
          // old page => -100% (slides up)
          return {
            y: "-100%",
            transition: { type: "tween", ease: "linear", duration: 0.3 },
          };
        default:
          return { y: 0 };
      }
    },
  };

  return (
    <>
      {/* mode="sync": old & new pages exist simultaneously */}
      <AnimatePresence mode="sync" initial={false} custom={direction}>
        <motion.div
          key={pageKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          custom={direction}
          // Absolutely position each route so they overlap 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
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
      {/* Outer container: no overflow hidden so partial pages are visible */}
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <InnerApp Component={Component} pageProps={pageProps} />
      </div>
      <Navigation />
    </>
  );
}

export default MyApp;
