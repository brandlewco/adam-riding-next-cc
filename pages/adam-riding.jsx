import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion, AnimatePresence } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import React from 'react';
import sizeOf from 'image-size';
import path from 'path';

const filer = new Filer({ path: 'content' });

function IndexPage({ page, collections }) {
  const router = useRouter();
  const [hoverIndex, setHoverIndex] = useState(-1);
  const hoverRefs = useRef([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleRouteChange = () => {
      console.log('Route change complete');
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    hoverRefs.current.forEach((ref) => {
      if (ref) {
        ref.style.setProperty('transform-origin', 'top left', 'important');
      }
    });
  }, [hoverIndex, collections.length]);

  const handleMouseEnter = useCallback((index) => {
    setHoverIndex(index);
    const img = new Image();
    img.src = collections[index].firstImagePath;
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
  }, [collections]);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  return (
    <DefaultLayout page={page}>
      <div className="flex h-screen">
        {/* Titles on the left */}
        <div className="w-1/3 p-4 overflow-y-auto">
          <ul className="flex flex-col gap-2">
            {collections.map((collection, collectionIndex) => (
              <li
                key={collectionIndex}
                className="text-6xl cursor-pointer"
                onMouseEnter={() => handleMouseEnter(collectionIndex)}
                onMouseLeave={handleMouseLeave}
                ref={(el) => (hoverRefs.current[collectionIndex] = el)}
                data-index={collectionIndex}
              >
                <Link href={`/collection/${collection.slug}`} passHref>
                  <motion.span
                    className="leading-tight text-black"
                  >
                    {collection.title}
                  </motion.span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Image on the right */}
        <div className="flex-1 relative m-4">
          {hoverIndex !== -1 && (
            <motion.div
              className="absolute top-0 right-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              layoutId={`collection-${collections[hoverIndex].slug}`} // Ensure layoutId matches the one in index.jsx
              style={{
                width: '100%',
                height: '85vh',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: `${(dimensions.width / dimensions.height) * 85}vh`,
                  height: '85vh',
                  position: 'relative',
                }}
              >
                <ExportedImage
                  src={collections[hoverIndex].firstImagePath}
                  alt={collections[hoverIndex].firstImageAlt || 'Collection image'}
                  fill
                  priority
                  style={{
                    objectFit: 'contain',
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}

export default React.memo(IndexPage);

export async function getStaticProps() {
  const page = await filer.getItem('adam-riding.md', { folder: 'pages' });
  const collections = [];

  for (const collectionPath of page.data.collections) {
    const correctedPath = collectionPath.replace(/^content\//, '');
    const collection = await filer.getItem(correctedPath, { folder: '' });

    const firstPhotoBlock = collection.data.content_blocks.find(
      (block) => block._bookshop_name === 'collection/photo'
    );

    if (firstPhotoBlock && firstPhotoBlock.image_path) {
      try {
        const imagePath = path.join(process.cwd(), 'public', firstPhotoBlock.image_path);
        const dimensions = sizeOf(imagePath);

        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split('/').pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text',
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (error) {
        console.error(`Error getting dimensions for image ${firstPhotoBlock.image_path}:`, error);
        // Handle the error or set default dimensions
        collections.push({
          title: collection.data.title,
          path: correctedPath,
          slug: collection.data.slug || correctedPath.split('/').pop(), // Ensure slug is set correctly
          firstImagePath: firstPhotoBlock.image_path,
          firstImageAlt: firstPhotoBlock.alt_text || 'Default Alt Text',
          width: 480, // Default width
          height: 320, // Default height assuming a 3:2 aspect ratio
        });
      }
    } else {
      console.log('No valid images found for:', collection.data.title);
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      collections,
    },
  };
}