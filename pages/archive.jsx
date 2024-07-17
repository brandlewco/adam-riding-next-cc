import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import ExportedImage from "next-image-export-optimizer";
import { useState, useEffect } from 'react';

const filer = new Filer({ path: 'content' });

function ArchivePage({ page, photos }) {
  return (
    <DefaultLayout page={page}>
      <div className="grid grid-cols-5 gap-4 p-4 overflow-y-auto">
        {photos.map((photo, photoIndex) => (
          <motion.div
            key={photoIndex}
            className="relative flex justify-center items-center"
            layout
            layoutId={`image-${photo.slug}-${photo.image_path}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: photoIndex * 0.1 }}
            style={{ originX: 0, originY: 0 }}
          >
            <PhotoBlock photo={photo} />
          </motion.div>
        ))}
      </div>
    </DefaultLayout>
  );
}

function PhotoBlock({ photo }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.src = photo.image_path;
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setDimensions({
        width: 200 * aspectRatio, // Calculate width based on the fixed height
        height: 200, // Fixed height
      });
    };
  }, [photo.image_path]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div style={{ height: 200, width: 'auto' }}></div>;
  }

  return (
    <div className="flex justify-center items-center h-200 w-auto overflow-hidden">
      <ExportedImage
        src={photo.image_path}
        alt={photo.alt_text || 'Photo image'}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          height: '200px',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}

export default ArchivePage;

export async function getStaticProps() {
  const page = await filer.getItem('archive.md', { folder: 'pages' });
  const photos = [];

  for (const photoBlock of page.data.content_blocks) {
    if (photoBlock._bookshop_name === 'collection/photo' && photoBlock.image_path) {
      photos.push({
        title: photoBlock.title || null,
        slug: photoBlock.slug || null,
        image_path: photoBlock.image_path || null,
        alt_text: photoBlock.alt_text || null,
      });
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      photos,
    },
  };
}
