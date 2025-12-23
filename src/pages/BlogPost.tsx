import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Calendar, ArrowLeft, Linkedin } from "lucide-react";
import { format } from "date-fns";

interface Author {
  id: string;
  first_name: string;
  last_name: string;
  expertise_area: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  authors: Author | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*, authors(*)")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching post:", error);
      setLoading(false);
      return;
    }

    setPost(data);

    // Fetch related posts by category
    if (data.category) {
      const { data: related } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, featured_image_url, published_at, created_at, authors(id, first_name, last_name)")
        .eq("published", true)
        .eq("category", data.category)
        .neq("id", data.id)
        .limit(3);

      setRelatedPosts(related || []);
    }

    setLoading(false);
  };

  // Update page title and meta tags for SEO
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Candidate Assess Blog`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", post.excerpt || post.title);
      }
    }
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
        <Link to="/blog">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Candidate Assess</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Home
            </Link>
            <Link to="/blog" className="text-foreground font-medium text-sm">
              Blog
            </Link>
            <Link to="/authors" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Authors
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button size="sm" className="btn-glow bg-primary hover:bg-primary/90 rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link to="/blog">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>

      {/* Article */}
      <article className="container mx-auto px-4 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="space-y-6 mb-12">
            {post.category && (
              <Badge variant="secondary" className="rounded-full">
                {post.category}
              </Badge>
            )}

            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-xl text-muted-foreground">
                {post.excerpt}
              </p>
            )}

            {/* Author & Date */}
            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              {post.authors && (
                <Link to={`/authors/${post.authors.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.authors.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink text-primary-foreground">
                      {getInitials(post.authors.first_name, post.authors.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {post.authors.first_name} {post.authors.last_name}
                    </p>
                    {post.authors.expertise_area && (
                      <p className="text-sm text-muted-foreground">{post.authors.expertise_area}</p>
                    )}
                  </div>
                </Link>
              )}

              <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.published_at || post.created_at), "MMMM d, yyyy")}</span>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="aspect-video rounded-3xl overflow-hidden mb-12">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
            {post.content.split("\n").map((paragraph, index) => (
              <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Author Bio */}
          {post.authors && (
            <div className="mt-16 p-8 rounded-3xl bg-muted/30 border border-border/50">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={post.authors.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink text-primary-foreground text-lg">
                    {getInitials(post.authors.first_name, post.authors.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg text-foreground">
                    {post.authors.first_name} {post.authors.last_name}
                  </p>
                  {post.authors.expertise_area && (
                    <p className="text-muted-foreground">{post.authors.expertise_area}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <Link to={`/authors/${post.authors.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full">
                        View Profile
                      </Button>
                    </Link>
                    {post.authors.linkedin_url && (
                      <a href={post.authors.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                          <Linkedin className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="max-w-6xl mx-auto mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`}>
                  <div className="group p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    {relatedPost.excerpt && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Candidate Assess. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPostPage;
