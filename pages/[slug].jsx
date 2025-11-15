import DefaultLayout from '../components/layouts/default';
import Blocks from '../components/shared/blocks';
import Filer from '@cloudcannon/filer';
const filer = new Filer({ path: 'content' });

	export default function Page({ page }) {
		const contentBlocks = page?.data?.content_blocks || [];

		return (
			<DefaultLayout page={page}>
	        <Blocks content_blocks={contentBlocks} />
			</DefaultLayout>
		);
	}

export async function getStaticPaths() {
	const slugs = (await filer.listItemSlugs('pages')).map((slug) => ({ params: { slug } }));
	const ignored = {
		index: true,
		blog: true,
		"404": true,
		"archive": true,
		"contact": true,
		"index-list": true,
		"index-grid": true,
		feed: true
	};

	return {
		paths: slugs.filter(({ params }) => !ignored[params.slug]),
		fallback: false
	};
}

	export async function getStaticProps({ params }) {
		try {
			const page = await filer.getItem(`${params.slug}.md`, { folder: 'pages' });

			if (!page || !page.data) {
				return { notFound: true };
			}

			return {
				props: {
					page: JSON.parse(JSON.stringify(page))
				}
			};
		} catch (error) {
			if (process.env.NODE_ENV !== 'production') {
				console.error(`[pages/[slug]] Failed to load ${params?.slug}:`, error);
			}
			return { notFound: true };
		}
	}