import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component

const md = new MarkdownIt({ html: true });

export default function CollectionPhotos({ block, dataBinding }) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0); // 0 for down, 1 for up

  const variants = {
    enter: ([page, direction]) => ({
        opacity: 0,
        y: direction === 1 ? -1000 : 1000  // Enter from top if up, bottom if down
    }),
    center: {
        zIndex: 1,
        opacity: 1,
        y: 0
    },
    exit: ([page, direction]) => ({
        opacity: 0,
        y: direction === 1 ? 1000 : -1000  // Exit to bottom if up, to top if down
    }),
};

const paginate = (newDirection) => {
    setDirection(newDirection);
    setPage(current => (current + (newDirection === 0 ? 1 : -1) + block.images.length) % block.images.length);
};


  useEffect(() => {
      const handleKeyDown = (event) => {
          if (event.key === 'ArrowUp') {
              paginate(1); // Navigate upwards
          } else if (event.key === 'ArrowDown') {
              paginate(0); // Navigate downwards
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, []);

  useEffect(() => {
      const handleWheel = (event) => {
          if (event.deltaY > 0) {
              paginate(0); // Scroll down
          } else if (event.deltaY < 0) {
              paginate(1); // Scroll up
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
          window.removeEventListener('wheel', handleWheel);
      };
  }, []);

  return (
    <section className="gallery" data-cms-bind={dataBinding} style={{ height: '90vh', overflow: 'hidden', position: 'relative' }}>
<AnimatePresence initial={false} custom={[page, direction]}>
        <motion.div
            key={page}
            custom={[page, direction]}  // Corrected this line
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                y: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
            }}
            className="flex justify-end items-start h-full w-full relative"
            style={{ position: 'absolute', inset: '0' }}
        >
            <Image
                src={block.images[page].image_path}
                alt="Slide Image"
                layout="fill"
                objectFit="contain"
                priority={page === 0}
            />
        </motion.div>
    </AnimatePresence>
</section>
  );
}
