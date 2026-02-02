'use client';

import { motion, Variants } from 'framer-motion';

const container: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        }
    }
};

const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 50
        }
    }
};

export default function PageContainer({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function PageItem({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div variants={item} className={className}>
            {children}
        </motion.div>
    );
}
