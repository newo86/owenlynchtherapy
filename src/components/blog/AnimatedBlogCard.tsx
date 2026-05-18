'use client';

import { motion } from 'motion/react';

interface AnimatedBlogCardProps {
  children: React.ReactNode;
  index: number;
}

export default function AnimatedBlogCard({ children, index }: AnimatedBlogCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.55,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex flex-col h-full"
    >
      {children}
    </motion.div>
  );
}
