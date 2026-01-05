import { useRef } from "react";
import { Quote } from "lucide-react";

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
        <div 
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-6 px-4 snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[320px] md:w-[400px] snap-center"
            >
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 rounded-3xl p-6 md:p-8 h-full flex flex-col">
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

        {/* Scroll Hint */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="text-xs text-muted-foreground">
            ← Scroll to see more →
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerStories;
