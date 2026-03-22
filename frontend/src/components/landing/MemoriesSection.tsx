import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api-production/api.js";

const CATEGORIES = [
  "All",
  "Alumni Meetup",
  "Iftar Mahfil",
  "Teacher Congratulation",
  "College Picnic",
  "Reunion",
  "General",
];

const MemoriesSection = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);

  const { data: memories = [] } = useQuery({
    queryKey: ["memories-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/memories?published=true`);
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json();
    },
  });

  const filtered =
    activeCategory === "All"
      ? memories
      : memories.filter((m) => m.category === activeCategory);

  if (memories.length === 0) return null;

  return (
    <section id="memories" className="border-t border-border/60 bg-background py-16 md:py-24">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="fs-eyebrow mb-2 font-semibold uppercase tracking-wider text-primary">Gallery</p>
          <h2 className="mb-3 fs-title font-bold text-foreground">Our Memories</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Cherished moments from our alumni gatherings, celebrations, and community events
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setVisibleCount(6); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.slice(0, visibleCount).map((memory, i) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                {memory.photo_url ? (
                  <img
                    src={memory.photo_url}
                    alt={memory.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                  </div>
                )}
                {/* Hover overlay */}
                {memory.description && (
                  <div className="absolute inset-0 bg-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="line-clamp-4 text-sm text-primary-foreground max-lg:text-justify max-lg:hyphens-auto">
                      {memory.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {memory.category}
                  </Badge>
                  {memory.event_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(memory.event_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground text-sm line-clamp-2">
                  {memory.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {(visibleCount < filtered.length || visibleCount > 6) && (
          <div className="flex items-center justify-center gap-4 mt-8">
            {visibleCount < filtered.length && (
              <>
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-5 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                >
                  See More ({filtered.length - visibleCount} remaining)
                </button>
                <button
                  onClick={() => setVisibleCount(filtered.length)}
                  className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  See All
                </button>
              </>
            )}
            {visibleCount > 6 && (
              <button
                onClick={() => setVisibleCount(6)}
                className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No memories found in this category.
          </p>
        )}
      </div>
    </section>
  );
};

export default MemoriesSection;
