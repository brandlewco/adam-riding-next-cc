import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, breaks: true });
const filer = new Filer({ path: 'content' });

function ContactPage({ page }) {
  const { column_1, column_2 } = page.data;

  return (
    <DefaultLayout page={page}>
      <div className="mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 sm:gap-x-4 cursor-default">
          {/* First Column */}
          <div className="col-span-1 sm:col-span-1">
            <div className="prose">
              <div dangerouslySetInnerHTML={{ __html: md.render(column_1) }} />
            </div>
          </div>

          {/* Second Column */}
          <div className="col-span-1 sm:col-span-3">
            <div className="prose">
              <div dangerouslySetInnerHTML={{ __html: md.render(column_2) }} />
            </div>
          </div>
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