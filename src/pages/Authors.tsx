import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Linkedin, FileText, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

interface Author {
  id: string;
  first_name: string;
  last_name: string;
  expertise_area: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  blog_count?: number;
}

const Authors = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    // Fetch authors
    const { data: authorsData, error } = await supabase
      .from("authors")
      .select("*")
      .order("first_name");

    if (error) {
      console.error("Error fetching authors:", error);
      setLoading(false);
      return;
    }

    // Fetch blog counts for each author
    const authorsWithCounts = await Promise.all(
      (authorsData || []).map(async (author) => {
        const { count } = await supabase
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", author.id)
          .eq("published", true);

        return {
          ...author,
          blog_count: count || 0,
        };
      })
    );

    setAuthors(authorsWithCounts);
    setLoading(false);
  };

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
            <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Blog
            </Link>
            <Link to="/authors" className="text-foreground font-medium text-sm">
              Authors
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="btn-glow bg-primary hover:bg-primary/90 rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16">
        <ScrollReveal direction="up">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Meet Our Authors
            </h1>
            <p className="text-lg text-muted-foreground">
              Industry experts sharing insights on recruitment, HR, and building better teams.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Authors Grid */}
      <section className="container mx-auto px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : authors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No authors yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {authors.map((author, index) => (
              <ScrollReveal key={author.id} direction="up" delay={index * 0.1}>
                <Link to={`/authors/${author.id}`}>
                  <Card className="group hover-glow border-border/50 bg-card/50 rounded-3xl overflow-hidden h-full">
                    <CardContent className="p-8 space-y-6 text-center">
                      <Avatar className="h-24 w-24 mx-auto ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <AvatarImage src={author.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-pink text-primary-foreground text-2xl">
                          {getInitials(author.first_name, author.last_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                          {author.first_name} {author.last_name}
                        </h2>
                        {author.expertise_area && (
                          <p className="text-muted-foreground text-sm">
                            {author.expertise_area}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{author.blog_count} {author.blog_count === 1 ? "article" : "articles"}</span>
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        {author.linkedin_url && (
                          <a 
                            href={author.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                              <Linkedin className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button variant="outline" className="rounded-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          View Profile
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
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

export default Authors;
