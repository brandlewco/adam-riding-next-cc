import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownIt from "markdown-it";
import Image from "next/image"; // Import the Next.js Image component
import { useRouter } from 'next/router'; // Import useRouter

const md = new MarkdownIt({ html: true });

export default function CollectionVideo({ block, dataBinding, nextSlug, prevSlug }) {
 
  return (
    <section className="gallery" data-cms-bind={dataBinding} >
      
    </section>
  );
}
