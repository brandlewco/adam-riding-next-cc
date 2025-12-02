import "../styles/globals.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "motion/react";
import Navigation from "../components/layouts/navigation";
import { useSwipeable } from "react-swipeable";

function InnerApp({ Component, pageProps }) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [pageKey, setPageKey] = useState(router.asPath);

  // Parse ?direction=up|down when leaving one /collection/ to another
  const handleRouteChangeStart = useCallback(
    (url) => {
      const isCurrentCollection = router.asPath.includes("/collection/");
      const isNextCollection = url.includes("/collection/");
      if (isCurrentCollection && isNextCollection) {
        setPageKey(url);

        // parse direction from ?direction=up|down
        const match = url.match(/[?&]direction=(up|down)/);
        setDirection(match ? match[1] : "");
      }
    },
    [router.asPath]
  );

  useEffect(() => {
    const events = router?.events;
    if (!events) return undefined;
    events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [router.events, handleRouteChangeStart]);

  // Also on route complete, read direction from query
  useEffect(() => {
    const dir = router.query.direction;
    if (dir === "up" || dir === "down") {
      setDirection(dir);
    } else {
      setDirection("");
    }
  }, [router.query.direction]);

  const swipeHandlers = useSwipeable({});

  /**
   * We want partial overlap:
   * - Old page: from y=0 to y=-100% if direction='down', or y=+100% if direction='up'
   * - New page: from y=+100% to y=0 if direction='down', or y=-100% if direction='up'
   * => They meet in the middle, both half on screen at the same time.
   */
  const pageVariants = {
    // For the old page’s exit or new page’s initial
    initial: (dir) => {
      if (dir === "down") {
        // new page starts at +100% (below)
        return { y: "100%", opacity: 1 };
      } else if (dir === "up") {
        // new page starts at -100% (above)
        return { y: "-100%", opacity: 1 };
      }
      // no shift if no direction
      return { y: 0, opacity: 1 };
    },
    animate: {
      // The new page slides to y=0
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeInOut",
      },
    },
    exit: (dir) => {
      // The old page slides out
      if (dir === "down") {
        // if direction=down => old page goes up => y:-100%
        return {
          y: "-100%",
          opacity: 1,
          transition: { duration: 0.4, ease: "easeInOut" },
        };
      } else if (dir === "up") {
        // if direction=up => old page goes down => y:+100%
        return {
          y: "100%",
          opacity: 1,
          transition: { duration: 0.4, ease: "easeInOut" },
        };
      }
      return { y: 0, opacity: 1 };
    },
  };

  return (
    /**
     * We omit mode="wait" so old & new pages animate simultaneously ("sync" mode).
     * => partial overlap: you'll see old sliding away while new slides in.
     */
    <AnimatePresence initial={false} custom={direction}>
      <motion.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={direction}
        variants={pageVariants}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        {...swipeHandlers}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
        <InnerApp Component={Component} pageProps={pageProps} />
      </div>
      <Navigation />
    </>
  );
}

export default MyApp;
