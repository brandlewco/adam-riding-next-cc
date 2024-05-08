import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component
import { useRouter } from 'next/router'; // Import useRouter

const md = new MarkdownIt({ html: true });

export default function CollectionPhotos({ block, dataBinding, nextSlug, prevSlug }) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0); // 0 for down, 1 for up
  const router = useRouter(); // Initialize the router

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

  // Add navigation handler
  useEffect(() => {
      const handleKeyDown = (event) => {
          if (event.key === 'ArrowUp') {
              paginate(1); // Navigate upwards
          } else if (event.key === 'ArrowDown') {
              paginate(0); // Navigate downwards
          } else if (event.key === 'ArrowRight') {
              router.push(`/collection/${nextSlug}`); // Navigate to the next gallery
          } else if (event.key === 'ArrowLeft') {
              router.push(`/collection/${prevSlug}`); // Navigate to the previous gallery
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [nextSlug, prevSlug]);

  return (
    <section className="gallery" data-cms-bind={dataBinding} style={{ height: '90vh', overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence initial={false} custom={[page, direction]}>
        <motion.div
            key={page}
            layoutId={`image-${block.images[page].image_path}`}
            custom={[page, direction]}
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
