import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Target, Sparkles, MessageSquare, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">Easy HR</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Trusted by 500+ HR Teams</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              A more elegant way to evaluate candidates.
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl">
              Easy HR helps you screen resumes, score candidates, and build shortlists with a clean and beautiful workflow.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Upload CV
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  Import from Excel
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Free trial available</span>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 via-pink/20 to-primary/10 flex items-center justify-center p-12">
              <Sparkles className="w-32 h-32 text-primary opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-pink/10 to-pink/5 border-pink/20 animate-fade-in">
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-pink" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground">Start with CV Upload</h3>
                <p className="text-muted-foreground">
                  Upload a single resume or multiple files to get instant AI-powered analysis.
                </p>
              </div>

              <Link to="/">
                <Button variant="link" className="text-pink hover:text-pink/80 p-0 group/btn">
                  Get started 
                  <span className="ml-2 group-hover/btn:translate-x-1 transition-transform inline-block">→</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground">Create List from Excel</h3>
                <p className="text-muted-foreground">
                  Import candidate lists instantly and manage your entire hiring pipeline.
                </p>
              </div>

              <Link to="/">
                <Button variant="link" className="text-primary hover:text-primary/80 p-0 group/btn">
                  Get started 
                  <span className="ml-2 group-hover/btn:translate-x-1 transition-transform inline-block">→</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Everything you need for better hiring
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple, powerful, and beautifully designed
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">AI-Powered Resume Analysis</h3>
              <p className="text-muted-foreground">
                Automatically extract skills, experience, and qualifications from any resume format.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Automatic Candidate Scoring</h3>
              <p className="text-muted-foreground">
                Get objective scores based on job requirements and make data-driven decisions.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Professional HR Feedback</h3>
              <p className="text-muted-foreground">
                Generate detailed feedback and insights to help improve candidate evaluation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary via-primary/90 to-pink border-0 overflow-hidden animate-fade-in">
          <CardContent className="p-12 md:p-16 text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Ready to transform your hiring?
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Join hundreds of HR teams who trust Easy HR for their recruitment needs.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Schedule Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Easy HR</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 Easy HR. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
