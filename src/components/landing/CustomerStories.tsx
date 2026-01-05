import { useRef, useState, useEffect } from "react";
import { Quote, MoveHorizontal } from "lucide-react";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Hide swipe hint after user scrolls
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasScrolled) {
        setHasScrolled(true);
        setShowSwipeHint(false);
      }

      // Calculate active index based on scroll position
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.firstElementChild?.clientWidth || 320;
      const gap = 24; // 6 * 4 = 24px gap
      const newIndex = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(newIndex, testimonials.length - 1));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasScrolled]);

  // Auto-hide swipe hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 px-4">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
            Customer Success Stories
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground">
            Trusted by hiring teams worldwide
          </h3>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative">
          {/* Swipe Hint Overlay - Mobile Only */}
          {showSwipeHint && (
            <div className="md:hidden absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
              <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3 shadow-lg border border-border/50 animate-pulse">
                <MoveHorizontal className="w-5 h-5 text-primary animate-bounce-x" />
                <span className="text-sm font-medium text-foreground">Swipe to explore</span>
              </div>
            </div>
          )}

          {/* Gradient Fade Edges */}
          <div className="absolute left-0 top-0 bottom-6 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-6 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-6 px-4 snap-x snap-mandatory scrollbar-hide touch-pan-x"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`
                  flex-shrink-0 w-[300px] md:w-[400px] snap-center
                  transition-all duration-500
                  ${activeIndex === index ? "scale-100 opacity-100" : "scale-95 opacity-70"}
                `}
              >
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 rounded-3xl p-6 md:p-8 h-full flex flex-col hover:border-primary/30 transition-colors duration-300">
                  <Quote className="w-8 h-8 text-primary/30 mb-4 flex-shrink-0" />
                  
                  <blockquote className="text-lg text-foreground font-medium leading-relaxed mb-6 flex-1">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  <div className="space-y-1 mt-auto">
                    <p className="text-base font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.title} at <span className="text-primary">{testimonial.company}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const container = scrollContainerRef.current;
                if (!container) return;
                const cardWidth = container.firstElementChild?.clientWidth || 320;
                const gap = 24;
                container.scrollTo({
                  left: index * (cardWidth + gap),
                  behavior: "smooth",
                });
              }}
              className={`
                transition-all duration-300 rounded-full
                ${index === activeIndex 
                  ? "w-8 h-2 bg-primary" 
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }
              `}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        {/* Desktop Scroll Hint */}
        <div className="hidden md:flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-6 h-[2px] bg-muted-foreground/30 rounded" />
            Scroll or drag to explore
            <span className="inline-block w-6 h-[2px] bg-muted-foreground/30 rounded" />
          </span>
        </div>
      </div>

      {/* Custom CSS for swipe animation */}
      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CustomerStories;
