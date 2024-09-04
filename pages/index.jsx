import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import ExportedImage from "next-image-export-optimizer";
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import useStore from '../lib/store';
import React from 'react';

const filer = new Filer({ path: 'content' });

function HomePage({ page, collections }) {
  const router = useRouter();
  const isInitialLoad = useStore((state) => state.isInitialLoad);
  const setInitialLoad = useStore((state) => state.setInitialLoad);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const [imageDimensions, setImageDimensions] = useState([]);

  const handleAnimationComplete = useCallback(() => {
    console.log('Animation complete');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasNavigated = sessionStorage.getItem('hasNavigated');
      if (hasNavigated) {
        setInitialLoad(false);
      } else {
        sessionStorage.setItem('hasNavigated', 'true');
        setInitialLoad(true);
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
    hoverRefs.current.forEach((ref) => {
      if (ref) {
        ref.style.setProperty('transform-origin', 'top left', 'important');
      }
    });
  }, [hoverIndex, collections.length]);

  useEffect(() => {
    const fetchImageDimensions = async () => {
      const dimensionsPromises = collections.map(async (collection) => {
        const image = new Image();
        image.src = collection.firstImagePath;
        await image.decode();
        return {
          width: image.width,
          height: image.height,
        };
      });
      const dimensions = await Promise.all(dimensionsPromises);
      setImageDimensions(dimensions);
    };

    fetchImageDimensions();
  }, [collections]);

  const handleMouseEnter = useCallback((index) => {
    setHoverIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  return (
    <DefaultLayout page={page}>
      <ul className="grid grid-flow-col justify-start">
        {collections.map((collection, collectionIndex) => {
          const dimensions = imageDimensions[collectionIndex] || { width: 200, height: 200 };
          const aspectRatio = dimensions.width / dimensions.height;

          console.log(`Rendering collection: ${collection.slug}, layoutId: collection-${collection.slug}`);

          return (
            <li
              key={collectionIndex}
              className="image-container"
              onMouseEnter={() => handleMouseEnter(collectionIndex)}
              onMouseLeave={handleMouseLeave}
              ref={(el) => (hoverRefs.current[collectionIndex] = el)}
            >
              <Link href={`/collection/${collection.slug}`} passHref>
                <motion.div
                  layoutId={`collection-${collection.slug}`}
                  initial={{ opacity: isInitialLoad ? 0 : 1 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3, delay: isInitialLoad ? collectionIndex * 0.3 : 0 }}
                  onAnimationComplete={handleAnimationComplete}
                  style={{ originX: 0, originY: 0 }}
                >
                  <ExportedImage
                    src={collection.firstImagePath}
                    alt={collection.firstImageAlt || 'Collection image'}
                    width={200 * aspectRatio}
                    height={200}
                    style={{
                      transition: 'transform 0.3s ease-in-out',
                      width: 'auto',
                      height: '200px',
                      objectFit: 'cover',
                    }}
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
          );
        })}
      </ul>
    </DefaultLayout>
  );
}

export default React.memo(HomePage);

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