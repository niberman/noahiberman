import { motion } from "framer-motion";
import { blogPosts } from "@/data/blog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { BilingualHeading } from "@/components/BilingualHeading";

export default function Blog() {
  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <BilingualHeading 
            english="Blog"
            spanish="El Blog"
            as="h1"
            className="mb-6"
          />
          <p className="text-xl text-muted-foreground leading-relaxed">
            Thoughts on aviation, entrepreneurship, and building things that matter.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-10">
          {blogPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <Link to={`/blog/${post.slug}`}>
                <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-500 hover:scale-[1.01] cursor-pointer group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-5 mb-4 text-base text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <span>{new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span>{post.readTime}</span>
                      </div>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {post.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl md:text-4xl font-display mb-3 group-hover:text-secondary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-lg leading-relaxed">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-secondary hover:underline font-medium text-lg inline-flex items-center group-hover:translate-x-2 transition-transform">
                      Read more →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
