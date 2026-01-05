import { useState, useEffect } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    quote: "Candidate Assess helped us cut our hiring time by 50%. The AI-generated assessments are spot-on for our technical roles.",
    name: "Sarah Johnson",
    title: "HR Director",
    company: "TechCorp",
  },
  {
    quote: "Finally, a hiring tool that actually understands what we need. The candidate scoring is incredibly accurate.",
    name: "Michael Chen",
    title: "Founder & CEO",
    company: "StartupXYZ",
  },
  {
    quote: "We've tried many hiring platforms, but Candidate Assess is the only one that truly automates our screening process.",
    name: "Emily Rodriguez",
    title: "Talent Lead",
    company: "InnovateCo",
  },
  {
    quote: "The assessments are perfectly tailored to each role. Our quality of hires has improved dramatically.",
    name: "David Kim",
    title: "COO",
    company: "GrowthHub",
  },
  {
    quote: "Simple, effective, and exactly what we needed. Candidate Assess has transformed how we hire.",
    name: "Lisa Thompson",
    title: "Senior Recruiter",
    company: "TalentFirst",
  },
];

export const CustomerStories = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const current = testimonials[activeIndex];

  return (
    <div 
      className="relative py-16 px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
            Customer Success Stories
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground">
            Trusted by hiring teams worldwide
          </h3>
        </div>

        {/* Testimonial Card */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Card */}
          <div 
            key={activeIndex}
            className="bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 rounded-3xl p-8 md:p-12 text-center animate-fade-in"
          >
            <Quote className="w-10 h-10 text-primary/30 mx-auto mb-6" />
            
            <blockquote className="text-xl md:text-2xl text-foreground font-medium leading-relaxed mb-8 max-w-2xl mx-auto">
              "{current.quote}"
            </blockquote>
            
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {current.name}
              </p>
              <p className="text-muted-foreground">
                {current.title} at <span className="text-primary">{current.company}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === activeIndex 
                  ? "w-8 h-2 bg-primary" 
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerStories;
