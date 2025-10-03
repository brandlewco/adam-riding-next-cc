import DefaultLayout from "../components/layouts/default";
import Filer from "@cloudcannon/filer";
import MarkdownIt from "markdown-it";
import { motion, AnimatePresence } from "framer-motion";

const md = new MarkdownIt({ html: true, breaks: true });
const filer = new Filer({ path: "content" });

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
  const columns = [
    { key: "column_1", content: column_1 },
    { key: "column_2", content: column_2 },
    { key: "column_3", content: column_3 },
  ];

  return (
    <DefaultLayout page={page}>
      <div className="contact min-h-screen flex flex-col px-4 pb-24 sm:pb-0 cursor-default">
        <motion.div
          key="heading"
          className="text-lg mb-12 w-full max-w-5xl"
          dangerouslySetInnerHTML={{ __html: md.render(heading) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
        <div className="flex-1 flex items-center justify-end">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-32 text-right w-1/2 ">
            {columns.map((col, index) => (
              <motion.div
                key={col.key}
                className="text-sm sm:text-base text-left"
                dangerouslySetInnerHTML={{ __html: md.render(col.content) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}

export default ContactPage;

export async function getStaticProps() {
  const page = await filer.getItem("contact.md", { folder: "pages" });

  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
    },
  };
}
