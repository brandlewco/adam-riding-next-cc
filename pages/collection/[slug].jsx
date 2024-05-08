import DefaultLayout from '../../components/layouts/default'; // Adjust the import path
import Blocks from '../../components/shared/blocks';
import Filer from '@cloudcannon/filer';

// Initialize Filer with the base path set to where your content lives
const filer = new Filer({ path: 'content' }); // Updated path to include 'collection'

export default function CollectionPage({ page, nextSlug, prevSlug }) {
  return (
    <DefaultLayout page={page}>
      <Blocks content_blocks={page.data.content_blocks} nextSlug={nextSlug} prevSlug={prevSlug} />
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
  // Fetch all collection slugs
  const slugs = await filer.listItemSlugs('collection');
  const currentIndex = slugs.indexOf(params.slug);
  const nextSlug = (currentIndex >= 0 && currentIndex < slugs.length - 1) ? slugs[currentIndex + 1] : slugs[0]; // Loop to first
  const prevSlug = (currentIndex > 0) ? slugs[currentIndex - 1] : slugs[slugs.length - 1]; // Loop to last

  const page = await filer.getItem(`${params.slug}.md`, { folder: 'collection' });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      nextSlug,
      prevSlug,
    },
  };
}

