import DefaultLayout from '../components/layouts/default';
import Filer from '@cloudcannon/filer';
import MarkdownIt from 'markdown-it';
import { motion, AnimatePresence } from 'framer-motion';

const md = new MarkdownIt({ html: true, breaks: true });
const filer = new Filer({ path: 'content' });

const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: (index) => ({
    opacity: 1,
    transition: {
      duration: 0.3,
      delay: 0.3 + index * 0.3,
    },
  }),
};

function ContactPage({ page }) {
  const { column_1, column_2, column_3, heading } = page.data;

  return (
    <DefaultLayout page={page}>
      {/* Main wrapper with height set to allow scrolling */}
      <div className="mx-auto p-4 contact h-screen overflow-y-auto pb-32 sm:mb-0 cursor-default">
  {/* Main Grid Container */}
  <div className="grid grid-cols-1 sm:grid-cols-6 gap-8">
    <AnimatePresence>
      {/* Heading - Full Width Row */}
      <motion.div
        className="col-span-6 pb-64 sm:pb-10 text-2xl"
        dangerouslySetInnerHTML={{ __html: md.render(heading) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
    </AnimatePresence>

    {/* Spacer: First three columns are empty to create the 3/6 spacer */}
    <div className="hidden sm:block sm:col-span-3"></div>

    <AnimatePresence>
      {/* Columns 1, 2, and 3 */}
      <motion.div
        className="flex flex-col col-span-6 sm:col-span-1 text-sm"
        dangerouslySetInnerHTML={{ __html: md.render(column_1) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      <motion.div
        className="flex flex-col col-span-6 sm:col-span-1 text-sm"
        dangerouslySetInnerHTML={{ __html: md.render(column_2) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      <motion.div
        className="flex flex-col col-span-6 sm:col-span-1 text-sm"
        dangerouslySetInnerHTML={{ __html: md.render(column_3) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
    </AnimatePresence>
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