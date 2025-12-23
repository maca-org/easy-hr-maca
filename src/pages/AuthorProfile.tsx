import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Linkedin, Calendar, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { format } from "date-fns";
import { ScrollReveal } from "@/components/ScrollReveal";

interface Author {
  id: string;
  first_name: string;
  last_name: string;
  expertise_area: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const AuthorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAuthor();
    }
  }, [id]);

  const fetchAuthor = async () => {
    // Fetch author
    const { data: authorData, error: authorError } = await supabase
      .from("authors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (authorError || !authorData) {
      console.error("Error fetching author:", authorError);
      setLoading(false);
      return;
    }

    setAuthor(authorData);

    // Fetch author's published posts
    const { data: postsData, error: postsError } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, category, featured_image_url, published_at, created_at")
      .eq("author_id", id)
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
    }

    setPosts(postsData || []);
    setLoading(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Author not found</h1>
        <Link to="/authors">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Authors
          </Button>
        </Link>
      </div>
    );
  }

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
            <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Blog
            </Link>
            <Link to="/authors" className="text-foreground font-medium text-sm">
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
        <Link to="/authors">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Authors
          </Button>
        </Link>
      </div>

      {/* Author Profile */}
      <section className="container mx-auto px-4 pb-12">
        <ScrollReveal direction="up">
          <div className="max-w-4xl mx-auto">
            <Card className="border-border/50 bg-card/50 rounded-3xl overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                    <AvatarImage src={author.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-pink text-primary-foreground text-3xl">
                      {getInitials(author.first_name, author.last_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                        {author.first_name} {author.last_name}
                      </h1>
                      {author.expertise_area && (
                        <p className="text-lg text-muted-foreground mt-2">
                          {author.expertise_area}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-5 w-5" />
                        <span className="font-medium">{posts.length} {posts.length === 1 ? "article" : "articles"}</span>
                      </div>

                      {author.linkedin_url && (
                        <a href={author.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="rounded-full gap-2">
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </section>

      {/* Author's Articles */}
      <section className="container mx-auto px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Articles by {author.first_name}
          </h2>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No articles published yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <ScrollReveal key={post.id} direction="up" delay={index * 0.1}>
                  <Link to={`/blog/${post.slug}`}>
                    <Card className="group hover-glow border-border/50 bg-card/50 rounded-3xl overflow-hidden h-full">
                      {post.featured_image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <CardContent className="p-6 space-y-4">
                        {post.category && (
                          <Badge variant="secondary" className="rounded-full">
                            {post.category}
                          </Badge>
                        )}
                        
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        
                        {post.excerpt && (
                          <p className="text-muted-foreground text-sm line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(post.published_at || post.created_at), "MMM d, yyyy")}</span>
                        </div>

                        <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                          Read more
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Candidate Assess. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AuthorProfile;
