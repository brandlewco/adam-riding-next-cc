import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, breaks: true });
const filer = new Filer({ path: 'content' });

function ContactPage({ page }) {
  const { column_1, column_2, column_3, heading } = page.data;

  return (
    <DefaultLayout page={page}>
      {/* Main wrapper with height set to allow scrolling */}
      <div className="mx-auto p-4 contact h-screen overflow-y-auto pb-32 sm:mb-0 cursor-default">
        {/* Main Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-8">
          {/* Heading - Full Width Row */}
          <div
            className="col-span-6 pb-64 sm:pb-10 text-2xl"
            dangerouslySetInnerHTML={{ __html: md.render(heading) }}
          />

          {/* Spacer: First three columns are empty to create the 3/6 spacer */}
          <div className="hidden sm:block sm:col-span-3"></div>

          {/* Column 1 - Studio & Commissions */}
          <div
            className="flex flex-col col-span-6 sm:col-span-1 text-sm"
            dangerouslySetInnerHTML={{ __html: md.render(column_1) }}
          />

          {/* Column 2 */}
          <div
            className="flex flex-col col-span-6 sm:col-span-1 text-sm"
            dangerouslySetInnerHTML={{ __html: md.render(column_2) }}
          />

          {/* Column 3 */}
          <div
            className="flex flex-col col-span-6 sm:col-span-1 text-sm"
            dangerouslySetInnerHTML={{ __html: md.render(column_3) }}
          />
        </div>
      </div>
    </DefaultLayout>
  );
}

export default ContactPage;

export async function getStaticProps() {
  const page = await filer.getItem('contact.md', { folder: 'pages' });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
    },
  };
}
