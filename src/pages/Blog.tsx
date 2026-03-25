import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BlogSectionContent } from "@/components/sections/BlogSection";
import { SEO } from "@/components/SEO";

export default function Blog() {
  return (
      <main className="min-h-screen pt-24 pb-16">
      <SEO
        title="Blog | Noah Berman"
        description="Aviation, AI systems, and technology insights from Noah Berman — a Denver-based commercial pilot, software engineer, and entrepreneur."
      />
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          {/* Back to home */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 sm:mb-16"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-3">
              Blog
            </h1>
            <p className="text-xl sm:text-2xl font-display italic text-secondary mb-6">
              Publicaciones
            </p>
            <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl">
              Thoughts on aviation, technology, entrepreneurship, and life at altitude.
            </p>
          </motion.header>

          {/* Blog posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <BlogSectionContent />
          </motion.div>
        </div>
      </main>
  );
}
