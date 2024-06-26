import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import ExportedImage from "next-image-export-optimizer";
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import useStore from '../lib/store';

const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
  const router = useRouter();
  const isInitialLoad = useStore((state) => state.isInitialLoad);
  const setInitialLoad = useStore((state) => state.setInitialLoad);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [animationsComplete, setAnimationsComplete] = useState(0);
  const hoverRefs = useRef([]);

  const handleAnimationComplete = useCallback(() => {
    setAnimationsComplete((prev) => {
      const newCount = prev + 1;
      return newCount;
    });
  }, [collections.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasNavigated = sessionStorage.getItem('hasNavigated');
      if (hasNavigated) {
        setInitialLoad(false);
        // console.log('Initial load state set to false (hasNavigated)');
      } else {
        sessionStorage.setItem('hasNavigated', 'true');
        setInitialLoad(true);
        // console.log('Initial load state set to true (first time)');
      }
    }
  }, [setInitialLoad]);

  useEffect(() => {
    const handleRouteChange = () => {
      setInitialLoad(false);
      console.log('Route change complete, setting initial load to false');
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, setInitialLoad]);

  useEffect(() => {
    if (isInitialLoad && animationsComplete === collections.length) {
      const lastGallerySlug = collections[collections.length - 1]?.slug;
      if (lastGallerySlug) {
        console.log(`Navigating to the last gallery item: /collection/${lastGallerySlug}`);
        router.push(`/collection/${lastGallerySlug}`);
      }
    }
  }, [isInitialLoad, animationsComplete, collections, router]);

  useEffect(() => {
    hoverRefs.current.forEach((ref) => {
      if (ref) {
        ref.style.setProperty('transform-origin', 'top center', 'important');
      }
    });
  }, [hoverIndex, collections.length]);

  return (
    <DefaultLayout page={page}>
      <ul className="grid grid-flow-col justify-start">
        {collections.map((collection, collectionIndex) => (
          <li
            key={collectionIndex}
            className="image-container"
            onMouseEnter={() => setHoverIndex(collectionIndex)}
            onMouseLeave={() => setHoverIndex(-1)}
            ref={(el) => (hoverRefs.current[collectionIndex] = el)}
          >
            <Link href={`/collection/${collection.slug}`} passHref>
              <motion.div
                layout
                layoutId={`image-${collection.slug}-${collection.firstImagePath}`}
                initial={{ opacity: isInitialLoad ? 0 : 1 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3, delay: isInitialLoad ? collectionIndex * 0.3 : 0 }}
                onAnimationComplete={() => handleAnimationComplete()}
                style={{ originX: 0, originY: 0}}
                >
                <ExportedImage
                  src={collection.firstImagePath}
                  alt={collection.firstImageAlt || 'Collection image'}
                  height={200}
                  width={200}
                  style={{ transition: 'transform 0.3s ease-in-out', width: 'auto', height: '200px' }}
                />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoverIndex === collectionIndex ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {collection.title}
                </motion.span>
              </motion.div>
            </Link>
          </li>
        ))}
      </ul>
    </DefaultLayout>
  );
}

export default HomePage;

export async function getStaticProps() {
  const page = await filer.getItem('index.md', { folder: 'pages' });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });

    const firstPhotoBlock = collection.data.content_blocks.find(block => block._bookshop_name === 'collection/photo');

    if (firstPhotoBlock && firstPhotoBlock.image_path) {
      collections.push({
        title: collection.data.title,
        path: correctedPath,
        slug: collection.data.slug,
        firstImagePath: firstPhotoBlock.image_path,
        firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text'
      });
    } else {
      console.log('No valid images found for:', collection.data.title);
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      collections
    }
  };
}