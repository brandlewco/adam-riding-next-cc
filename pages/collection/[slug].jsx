import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import DefaultLayout from '../../components/layouts/default';
import Blocks from '../../components/shared/blocks';
import Filer from '@cloudcannon/filer';

const filer = new Filer({ path: 'content' });

export default function CollectionPage({ page, nextSlug, prevSlug }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [animationDirection, setAnimationDirection] = useState(true); // true for downward, false for upward
  const router = useRouter();

  const variants = {
    enter: (direction) => ({
      opacity: 0,
      y: direction ? 1000 : -1000, // If direction is true, enter from below, otherwise from above
    }),
    center: {
      zIndex: 1,
      opacity: 1,
      y: 0,
    },
    exit: (direction) => ({
      opacity: 0,
      y: direction ? -1000 : 1000, // If direction is true, exit to above, otherwise to below
    }),
  };
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      let newIndex;
      let direction = (event.key === 'ArrowDown'); // true for down, false for up
  
      if (event.key === 'ArrowRight') {
        router.push(`/collection/${nextSlug}`);
      } else if (event.key === 'ArrowLeft') {
        router.push(`/collection/${prevSlug}`);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (event.key === 'ArrowDown') {
          newIndex = (currentImage + 1) % page.data.content_blocks.length; // Loop forward
        } else {
          newIndex = (currentImage - 1 + page.data.content_blocks.length) % page.data.content_blocks.length; // Loop backward
        }
        setCurrentImage(newIndex);
        setAnimationDirection(direction);
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentImage, nextSlug, prevSlug, page.data.content_blocks.length, router]);

  return (
    <DefaultLayout page={page}>
    <div className='flex flex-end h-screen w-screen overflow-hidden relative z-0'>
      <AnimatePresence initial={false} custom={animationDirection}>
        <motion.div
          key={currentImage}
          layoutId={`image-${page.data.slug}`}  // This should match the `layoutId` used in the index.jsx
          custom={animationDirection} // Pass the direction as custom prop to variants
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: { type: "tween", ease: "easeInOut", duration: 0.3 },
            opacity: { duration: 0.3 }
          }}
          className=""
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Blocks content_blocks={page.data.content_blocks} currentImage={currentImage} />
        </motion.div>
      </AnimatePresence>
    </div>
  </DefaultLayout>
);
}



export async function getStaticPaths() {
  // Fetch slugs from the 'collection' folder now
  const slugs = (await filer.listItemSlugs('collection')).map((slug) => ({ params: { slug } }));
  // Adjust ignored slugs as necessary, depending on your 'collection' content
  const ignored = { "404": true };

  return {
    paths: slugs.filter(({ params }) => !ignored[params.slug]),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const slugs = await filer.listItemSlugs('collection');
  const currentIndex = slugs.indexOf(params.slug);

  // Calculate next and previous slugs, wrapping around to create a loop
  const nextSlug = currentIndex >= 0 && currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : slugs[0];
  const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : slugs[slugs.length - 1];

  const page = await filer.getItem(`${params.slug}.md`, { folder: 'collection' });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)), // Ensure page data is serializable
      nextSlug,
      prevSlug,
    },
  };
}