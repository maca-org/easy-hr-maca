import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Send, Users, Sparkles, CheckCircle, Mail, HelpCircle, Building2 } from "lucide-react";
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
            <span className="text-xl font-semibold text-foreground">Candidate Assess</span>
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
            <a href="#support" className="text-muted-foreground hover:text-foreground transition-colors">
              Support
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
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
              <span>Simple & Powerful Hiring Tool</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Just need to give Job opening title and description and good to go!
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl">
              Candidate Assess helps you collect applications, send assessments, and find the best candidates with minimal effort.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  Watch Demo
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
                <span>Free plan available</span>
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
                <Link2 className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Get job apply link or manually upload resume</h3>
              <p className="text-muted-foreground">
                Create a shareable application link for candidates or upload resumes manually to your dashboard.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Send assessment to candidates</h3>
              <p className="text-muted-foreground">
                Automatically send customized assessments to evaluate candidate skills and qualifications.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Build your best future team</h3>
              <p className="text-muted-foreground">
                Never miss good candidates. Make data-driven decisions to build your dream team.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your hiring needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
                <p className="text-muted-foreground">Perfect for getting started</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Unlimited CV uploads</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Email support</span>
                </li>
              </ul>

              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-primary/50 relative" style={{ animationDelay: "0.1s" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              Most Popular
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Pro</h3>
                <p className="text-muted-foreground">For growing teams</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-4xl font-bold text-foreground">$79</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>250 candidate unlocks/month</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Priority support</span>
                </li>
              </ul>

              <Link to="/auth" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Enterprise</h3>
                <p className="text-muted-foreground">For large organizations</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-4xl font-bold text-foreground">Custom</span>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Unlimited candidate unlocks</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>Dedicated account manager</span>
                </li>
              </ul>

              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/5 to-pink/5 border-border/50 animate-fade-in">
            <CardContent className="p-12 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">About Candidate Assess</h2>
              </div>
              
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  Candidate Assess is built to simplify the hiring process for teams of all sizes. We believe that finding the right talent shouldn't be complicated or time-consuming.
                </p>
                <p>
                  Our platform combines powerful AI-driven assessments with an intuitive interface, helping you focus on what matters most - connecting with great candidates and building your dream team.
                </p>
                <p>
                  Whether you're a startup looking for your first hire or an enterprise scaling your workforce, Candidate Assess provides the tools you need to make confident hiring decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            We're here to help
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the support you need, when you need it
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50">
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">Email Support</h3>
              <p className="text-muted-foreground">
                Have a question or need assistance? Our support team is ready to help you.
              </p>
              <a href="mailto:support@candidateassess.com" className="text-primary hover:underline font-medium">
                support@candidateassess.com
              </a>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 animate-fade-in border-border/50" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HelpCircle className="w-7 h-7 text-pink" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">FAQ & Documentation</h3>
              <p className="text-muted-foreground">
                Find answers to common questions and learn how to get the most out of Candidate Assess.
              </p>
              <span className="text-primary font-medium">
                Coming soon
              </span>
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
              Join hundreds of HR teams who trust Candidate Assess for their recruitment needs.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/auth">
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
              <span className="font-semibold text-foreground">Candidate Assess</span>
            </div>

            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#about" className="hover:text-foreground transition-colors">About</a>
              <a href="#support" className="hover:text-foreground transition-colors">Support</a>
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
