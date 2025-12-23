import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CheckCircle, Mail, HelpCircle, Zap, Send, Target, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const rotatingWords = ["Assess", "Screen", "Evaluate", "Shortlist", "Rank", "Decide"];

const Landing = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Candidate Assess</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              About
            </a>
            <a href="#support" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Support
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>Hiring made simple</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                Candidate…
              </h1>
              <div className="h-16 md:h-20 overflow-hidden">
                <div 
                  className="transition-transform duration-700 ease-out"
                  style={{ transform: `translateY(-${currentWordIndex * 16.667}%)` }}
                >
                  {rotatingWords.map((word) => (
                    <div 
                      key={word}
                      className="text-5xl md:text-7xl font-bold gradient-text h-16 md:h-20 flex items-center"
                    >
                      {word}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xl text-foreground/80 font-medium mt-4">
                but smarter.
              </p>
            </div>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Generate role-based assessments, send them to candidates, and instantly see who really fits.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started Free
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="ghost" 
                className="rounded-full px-8 h-12 text-base font-medium text-muted-foreground hover:text-foreground group"
                onClick={scrollToFeatures}
              >
                See how it works
                <ArrowDown className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              No demos. No calls. Just try it free.
            </p>
          </div>

          {/* Hero Visual - Glassmorphism UI Mockup */}
          <div className="relative">
            <div className="absolute inset-0 gradient-bg rounded-[2.5rem] blur-3xl opacity-60" />
            <div className="relative glass rounded-[2rem] p-8 animate-float">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse-soft" />
                    <span className="text-foreground font-semibold">Senior Frontend Developer</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Active</span>
                </div>

                {/* Assessment Status */}
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Assessment generated</span>
                  <span className="text-primary">✨</span>
                </div>

                {/* Candidate Scores */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-pink flex items-center justify-center text-primary-foreground text-sm font-medium">
                      JD
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">John Doe</span>
                        <span className="text-sm font-semibold text-primary">92%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-pink rounded-full" style={{ width: "92%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-medium">
                      SA
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Sarah Anderson</span>
                        <span className="text-sm font-semibold text-primary">87%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-pink rounded-full" style={{ width: "87%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-pink/60 flex items-center justify-center text-primary-foreground text-sm font-medium">
                      MK
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Mike Kim</span>
                        <span className="text-sm font-semibold text-muted-foreground">74%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30 rounded-full" style={{ width: "74%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action hint */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    3 candidates assessed • 1 ready to interview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="container mx-auto px-4 py-24">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Hiring, but simpler.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to find the perfect candidate, nothing you don't.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="group hover-lift border-border/50 bg-card/50 rounded-3xl overflow-hidden">
            <CardContent className="p-8 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Create once, relax</h3>
              <p className="text-muted-foreground leading-relaxed">
                Set up your job opening with just a title and description. We handle the rest — assessments, questions, scoring.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover-lift border-border/50 bg-card/50 rounded-3xl overflow-hidden">
            <CardContent className="p-8 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink/20 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Send className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Send it everywhere</h3>
              <p className="text-muted-foreground leading-relaxed">
                Share your apply link or manually upload resumes — your choice, always. Candidates come to you.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover-lift border-border/50 bg-card/50 rounded-3xl overflow-hidden">
            <CardContent className="p-8 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">See who actually fits</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered scores show you the best matches instantly. No more guesswork, no more spreadsheets.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-24">
        <div className="text-center space-y-4 mb-6">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Pricing that doesn't overthink.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade only when you need more candidate analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          {/* Free Plan */}
          <Card className="hover-lift border-border/50 rounded-3xl bg-card/50">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
                <p className="text-muted-foreground text-sm">Perfect for getting started</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-5xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Unlimited CV uploads</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Email support</span>
                </li>
              </ul>

              <Link to="/auth" className="block pt-4">
                <Button variant="outline" className="w-full rounded-full h-12">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="hover-lift border-primary/50 rounded-3xl relative bg-gradient-to-b from-primary/5 to-transparent">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              Most Popular
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Pro</h3>
                <p className="text-muted-foreground text-sm">For growing teams</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-5xl font-bold text-foreground">$79</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>250 candidate unlocks/month</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>

              <Link to="/auth" className="block pt-4">
                <Button className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="hover-lift border-border/50 rounded-3xl bg-card/50">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Enterprise</h3>
                <p className="text-muted-foreground text-sm">For large organizations</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-5xl font-bold text-foreground">Custom</span>
              </div>

              <ul className="space-y-3 pt-4">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Unlimited candidate unlocks</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Dedicated account manager</span>
                </li>
              </ul>

              <Link to="/auth" className="block pt-4">
                <Button variant="outline" className="w-full rounded-full h-12">
                  Contact Sales
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            About us
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              We built Candidate Assess because hiring should be simple. 
              Not spreadsheets. Not guesswork. Just clarity.
            </p>
            <p>
              We're a small team obsessed with making hiring feel less like a chore 
              and more like finding the perfect puzzle piece.
            </p>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="container mx-auto px-4 py-24">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            We're here to help
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Get the support you need, when you need it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="hover-lift border-border/50 rounded-3xl bg-card/50">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-pink/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Email Support</h3>
              <p className="text-muted-foreground">
                Have a question? We're here to help.
              </p>
              <a href="mailto:support@candidateassess.com" className="text-primary hover:underline font-medium inline-block">
                support@candidateassess.com
              </a>
            </CardContent>
          </Card>

          <Card className="hover-lift border-border/50 rounded-3xl bg-card/50">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink/20 to-primary/20 flex items-center justify-center">
                <HelpCircle className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Docs & FAQ</h3>
              <p className="text-muted-foreground">
                Find answers to common questions.
              </p>
              <span className="text-muted-foreground/70 font-medium inline-block">
                Coming soon
              </span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary via-primary/95 to-pink border-0 overflow-hidden rounded-3xl">
            <CardContent className="p-12 md:p-16 text-center space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                Ready to hire smarter?
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
                Join hundreds of teams who trust Candidate Assess for their hiring.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 rounded-full px-8 h-12 font-medium shadow-lg">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-pink flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">Candidate Assess</span>
            </div>

            <nav className="flex items-center gap-8 text-sm">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="#support" className="text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2025 Candidate Assess. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
