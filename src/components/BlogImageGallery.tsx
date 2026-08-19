import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogImage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * `card` renders the compact gallery used inside clickable post cards (clicks
 * stay in the gallery); `full` renders the article-page gallery.
 */
export type BlogGalleryVariant = "card" | "full";

interface BlogImageGalleryProps {
  images: BlogImage[];
  title: string;
  variant?: BlogGalleryVariant;
}

const STYLES = {
  card: {
    image: "w-full h-48 sm:h-56 lg:h-64 object-cover",
    caption: "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent",
    arrow: "p-1.5",
    arrowLeft: "left-2",
    arrowRight: "right-2",
    arrowIcon: "h-5 w-5",
    dots: "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5",
    dot: "w-2 h-2",
    activeDot: "w-4",
  },
  full: {
    image: "w-full h-64 sm:h-80 lg:h-96 object-cover",
    caption: "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent",
    arrow: "p-2",
    arrowLeft: "left-3",
    arrowRight: "right-3",
    arrowIcon: "h-6 w-6",
    dots: "absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2",
    dot: "w-2.5 h-2.5",
    activeDot: "w-5",
  },
} as const;

export function BlogImageGallery({ images, title, variant = "full" }: BlogImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const styles = STYLES[variant];
  const isolateClick = (e: React.MouseEvent) => {
    if (variant === "card") e.stopPropagation();
  };

  const goToPrevious = (e: React.MouseEvent) => {
    isolateClick(e);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    isolateClick(e);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative group rounded-xl overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || title}
          className={styles.image}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </AnimatePresence>

      {images[currentIndex].caption && (
        <div className={styles.caption}>
          <p className="text-white text-sm">{images[currentIndex].caption}</p>
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
              styles.arrow,
              styles.arrowLeft,
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className={styles.arrowIcon} />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
              styles.arrow,
              styles.arrowRight,
            )}
            aria-label="Next image"
          >
            <ChevronRight className={styles.arrowIcon} />
          </button>

          <div className={styles.dots}>
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  isolateClick(e);
                  setCurrentIndex(index);
                }}
                className={cn(
                  "rounded-full transition-all",
                  styles.dot,
                  index === currentIndex
                    ? cn("bg-white", styles.activeDot)
                    : "bg-white/50 hover:bg-white/70",
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
