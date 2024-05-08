import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component

const md = new MarkdownIt({ html: true });

export default function CollectionPhotos({ block, dataBinding }) {

  return (
    <section className="index" data-cms-bind={dataBinding} >
    </section>
  );
}
