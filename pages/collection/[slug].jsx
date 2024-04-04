import DefaultLayout from '../../components/layouts/default'; // Adjust the import path
import Blocks from '../../components/shared/blocks';
import Filer from '@cloudcannon/filer';

// Initialize Filer with the base path set to where your content lives
const filer = new Filer({ path: 'content' }); // Updated path to include 'collection'

export default function CollectionPage({ page }) {
  return (
    <DefaultLayout page={page}>
      <Blocks content_blocks={page.data.content_blocks}></Blocks>
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
  // Fetch the item from the 'collection' folder instead of 'pages'
  const page = await filer.getItem(`${params.slug}.md`, { folder: 'collection' });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)), // Ensure page data is serializable
    },
  };
}
