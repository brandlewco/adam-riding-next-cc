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

  // Track route changes among /collection/ pages to animate
  const handleRouteChangeStart = useCallback(
    (url) => {
      const isCurrent = router.pathname.includes("/collection/");
      const isNext = url.includes("/collection/");
      if (isCurrent && isNext) {
        // If navigating from one /collection/ to another /collection/,
        // we set a new pageKey so AnimatePresence triggers an exit/enter
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

  // Whenever route changes, see if "direction" is in the query. If so, set local direction.
  useEffect(() => {
    if (router.query.direction) {
      setDirection(router.query.direction);
    } else {
      setDirection("");
    }
  }, [router.query.direction]);

  // Minimal swipe handlers (optional, unused for up/down)
  const swipeHandlers = useSwipeable({});

  const pageVariants = {
    /**
     * direction='down': we want new page to come from top => 0,
     * old page => 0 => +100%. So visually everything moves downward.
     *
     * direction='up': new page from bottom => 0,
     * old page => 0 => -100%. So visually everything moves upward.
     */
    initial: (dir) => {
      switch (dir) {
        case "down":
          return { y: "-100%", opacity: 0 };
        case "up":
          return { y: "100%", opacity: 0 };
        default:
          return { y: 0, opacity: 0 };
      }
    },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 25,
        duration: 0.7,
      },
    },
    exit: (dir) => {
      switch (dir) {
        case "down":
          // old page goes 0 => +100%
          return {
            y: "100%",
            opacity: 0,
            transition: {
              type: "spring",
              stiffness: 150,
              damping: 25,
              duration: 0.7,
            },
          };
        case "up":
          // old page goes 0 => -100%
          return {
            y: "-100%",
            opacity: 0,
            transition: {
              type: "spring",
              stiffness: 150,
              damping: 25,
              duration: 0.7,
            },
          };
        default:
          return { y: 0, opacity: 0 };
      }
    },
  };

  return (
    <>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={pageKey}
          initial="initial"
          animate="animate"
          exit="exit"
          custom={direction}
          variants={pageVariants}
          style={{ position: "relative" }}
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
