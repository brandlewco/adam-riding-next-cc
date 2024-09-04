import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import { motion } from 'framer-motion';
import ExportedImage from 'next-image-export-optimizer';
import sizeOf from 'image-size';
import path from 'path';

const filer = new Filer({ path: 'content' });

function ArchivePage({ page, photos }) {
  return (
    <DefaultLayout page={page}>
      <div className="h-screen overflow-y-auto">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-10 p-4">
          {photos.map((photo, photoIndex) => (
            <motion.div
              key={photoIndex}
              className="relative flex justify-center items-center"
              layout
              layoutId={`image-${photo.slug}-${photo.image_path}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: photoIndex * 0.05 }}
              style={{ originX: 0, originY: 0 }}
            >
              <PhotoBlock photo={photo} />
            </motion.div>
          ))}
        </div>
      </div>
    </DefaultLayout>
  );
}

function PhotoBlock({ photo }) {
  return (
    <div className="flex justify-center items-center overflow-hidden" style={{ height: '150px' }}>
      <ExportedImage
        src={photo.image_path}
        alt={photo.alt_text || 'Photo image'}
        width={photo.width}
        height={photo.height}
        style={{
          height: '150px',
          width: 'auto',
          objectFit: 'contain',
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
      try {
        const imagePath = path.join(process.cwd(), 'public', photoBlock.image_path);
        const dimensions = sizeOf(imagePath);
        photos.push({
          title: photoBlock.title || null,
          slug: photoBlock.slug || null,
          image_path: photoBlock.image_path || null,
          alt_text: photoBlock.alt_text || null,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (error) {
        console.error(`Error getting dimensions for image ${photoBlock.image_path}:`, error);
        // Handle the error or set default dimensions
        photos.push({
          title: photoBlock.title || null,
          slug: photoBlock.slug || null,
          image_path: photoBlock.image_path || null,
          alt_text: photoBlock.alt_text || null,
          width: 800, // Default width
          height: 600, // Default height
        });
      }
    }
  }

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      photos,
    },
  };
}