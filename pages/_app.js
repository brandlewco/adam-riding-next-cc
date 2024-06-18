import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../components/layouts/navigation";
import { useAnimationDirection } from "../hooks/useAnimationDirection";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { direction, setDirection } = useAnimationDirection();
  const [pageKey, setPageKey] = useState(router.pathname);

  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      if (url.includes("/collection/")) {
        setDirection(router.pathname < url ? 'right' : 'left');
      }
      setPageKey(url);
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
    };
  }, [router, setDirection]);

  const variants = {
    enter: { opacity: 0, x: direction === 'right' ? 50 : -50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === 'right' ? -50 : 50 },
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={pageKey}
          initial="enter"
          animate="center"
          exit="exit"
          variants={router.pathname.includes("/collection/") ? variants : {}}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        >
          <Component {...pageProps} />
        </motion.div>
      </AnimatePresence>
      <Navigation />
    </>
  );
}

export default MyApp;
