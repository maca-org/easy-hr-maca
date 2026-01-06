import { useState, useEffect, useRef } from "react";
import { Briefcase, Share2, ClipboardList, Trophy, Check } from "lucide-react";

const steps = [
  {
    id: "create",
    title: "Create",
    subtitle: "Create once, relax",
    description: "Set up your job description and title. Our AI automatically generates unique assessments tailored to your role.",
    icon: Briefcase,
    color: "from-primary to-primary/70",
  },
  {
    id: "share",
    title: "Share",
    subtitle: "Share everywhere",
    description: "Share your job opening link everywhere — LinkedIn, job boards, email. Collect candidates from any source.",
    icon: Share2,
    color: "from-pink to-pink/70",
  },
  {
    id: "assess",
    title: "Assess",
    subtitle: "AI-powered tests",
    description: "Send unique assessments to candidates. 15 MCQs + 4 open-ended questions scored instantly by AI.",
    icon: ClipboardList,
    color: "from-primary to-pink",
  },
  {
    id: "hire",
    title: "Hire",
    subtitle: "Find the best",
    description: "See ranked candidates with detailed scores. Send offer letters to your future teammates directly.",
    icon: Trophy,
    color: "from-pink to-primary",
  },
];

export const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState<number[]>([0, 0, 0, 0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll-based step change and parallax using Intersection Observer
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((ref, index) => {
      if (!ref) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Update scroll progress for parallax
            const progress = Math.min(Math.max(entry.intersectionRatio * 1.5, 0), 1);
            setScrollProgress(prev => {
              const newProgress = [...prev];
              newProgress[index] = progress;
              return newProgress;
            });

            // Lower threshold (0.3) for faster, more responsive button color change
            if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
              setActiveStep(index);
            }
          });
        },
        {
          threshold: Array.from({ length: 20 }, (_, i) => i / 20),
          rootMargin: "-20% 0px -20% 0px",
        }
      );

      observer.observe(ref);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const scrollToStep = (index: number) => {
    // Update the active button immediately (don’t wait for IntersectionObserver)
    setActiveStep(index);

    stepRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Sticky Toolbar */}
      <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 mb-8">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => scrollToStep(index)}
              className={`
                relative px-4 md:px-6 py-3 rounded-full font-medium text-sm md:text-base
                transition-all duration-500 ease-out overflow-hidden
                ${activeStep === index 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              {activeStep === index && (
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-pink opacity-20 animate-pulse" style={{ animationDuration: "2s" }} />
              )}
              <span className="relative z-10">{step.title}</span>
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === activeStep 
                  ? "w-8 bg-primary" 
                  : index < activeStep 
                    ? "w-4 bg-primary/50" 
                    : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable Steps with Parallax */}
      <div className="space-y-32 md:space-y-48">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const progress = scrollProgress[index];
          const isActive = activeStep === index;
          
          // Parallax transforms
          const mockupTranslateY = (1 - progress) * 50;
          const textTranslateY = (1 - progress) * 30;
          const mockupScale = 0.85 + (progress * 0.15);
          const opacity = 0.3 + (progress * 0.7);

          return (
            <div
              key={step.id}
              ref={(el) => (stepRefs.current[index] = el)}
              className="scroll-mt-40"
            >
              <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                  {/* Visual Mockup with Parallax */}
                  <div 
                    className={`${index % 2 === 0 ? "md:order-1" : "md:order-2"}`}
                    style={{
                      transform: `translateY(${mockupTranslateY}px) scale(${mockupScale})`,
                      opacity: opacity,
                      transition: "transform 0.1s ease-out, opacity 0.3s ease-out",
                    }}
                  >
                    <div className={`
                      relative aspect-[4/3] rounded-3xl overflow-hidden
                      bg-gradient-to-br ${step.color}
                      p-1 shadow-2xl
                      transition-shadow duration-500
                      ${isActive ? "shadow-primary/30" : "shadow-primary/10"}
                    `}>
                      {/* Animated gradient border */}
                      <div 
                        className="absolute inset-0 rounded-3xl opacity-50"
                        style={{
                          background: `linear-gradient(${90 + progress * 180}deg, hsl(var(--primary)), hsl(var(--pink)), hsl(var(--primary)))`,
                          transition: "background 0.5s ease-out",
                        }}
                      />
                      <div className="absolute inset-1 rounded-[20px] bg-background/95 backdrop-blur-sm p-6 md:p-8 z-10">
                        {index === 0 && <CreateMockup isActive={isActive} />}
                        {index === 1 && <ShareMockup isActive={isActive} />}
                        {index === 2 && <AssessMockup isActive={isActive} />}
                        {index === 3 && <HireMockup isActive={isActive} />}
                      </div>
                    </div>
                  </div>

                  {/* Text Content with Parallax */}
                  <div 
                    className={`space-y-6 text-center md:text-left ${index % 2 === 0 ? "md:order-2" : "md:order-1"}`}
                    style={{
                      transform: `translateY(${textTranslateY}px)`,
                      opacity: opacity,
                      transition: "transform 0.1s ease-out, opacity 0.3s ease-out",
                    }}
                  >
                    <div 
                      className={`
                        inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-gradient-to-br ${step.color}
                        shadow-lg transition-all duration-500
                      `}
                      style={{
                        transform: `scale(${0.8 + progress * 0.2}) rotate(${(1 - progress) * -10}deg)`,
                      }}
                    >
                      <StepIcon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    
                    <div className="space-y-2">
                      <p 
                        className="text-sm font-medium text-primary uppercase tracking-wider"
                        style={{
                          transform: `translateX(${(1 - progress) * (index % 2 === 0 ? -20 : 20)}px)`,
                          transition: "transform 0.2s ease-out",
                        }}
                      >
                        Step {index + 1} of {steps.length}
                      </p>
                      <h3 
                        className="text-3xl md:text-4xl font-bold text-foreground"
                        style={{
                          transform: `translateX(${(1 - progress) * (index % 2 === 0 ? -30 : 30)}px)`,
                          transition: "transform 0.3s ease-out",
                        }}
                      >
                        {step.subtitle}
                      </h3>
                    </div>
                    
                    <p 
                      className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0"
                      style={{
                        transform: `translateX(${(1 - progress) * (index % 2 === 0 ? -40 : 40)}px)`,
                        transition: "transform 0.4s ease-out",
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mockup Components with animation props
const CreateMockup = ({ isActive }: { isActive: boolean }) => (
  <div className="h-full flex flex-col gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-3 h-3 rounded-full bg-destructive/60 transition-transform duration-500 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-yellow-500/60 transition-transform duration-500 delay-75 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-green-500/60 transition-transform duration-500 delay-150 ${isActive ? "scale-100" : "scale-75"}`} />
    </div>
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Job Title</div>
      <div className={`h-10 rounded-lg bg-muted/50 flex items-center px-4 transition-all duration-500 ${isActive ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-70"}`}>
        <span className="text-sm text-foreground">Senior React Developer</span>
      </div>
    </div>
    <div className="space-y-3 flex-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Description</div>
      <div className={`h-full min-h-[80px] rounded-lg bg-muted/50 p-4 transition-all duration-700 ${isActive ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-70"}`}>
        <div className="space-y-2">
          <div className={`h-2 bg-muted rounded transition-all duration-500 ${isActive ? "w-full" : "w-3/4"}`} />
          <div className={`h-2 bg-muted rounded transition-all duration-700 ${isActive ? "w-4/5" : "w-1/2"}`} />
          <div className={`h-2 bg-muted rounded transition-all duration-900 ${isActive ? "w-3/4" : "w-1/3"}`} />
        </div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className={`px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 transition-all duration-500 ${isActive ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-90"}`}>
        <Check className="w-4 h-4" />
        Create Job
      </div>
    </div>
  </div>
);

const ShareMockup = ({ isActive }: { isActive: boolean }) => (
  <div className="h-full flex flex-col gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-3 h-3 rounded-full bg-destructive/60 transition-transform duration-500 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-yellow-500/60 transition-transform duration-500 delay-75 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-green-500/60 transition-transform duration-500 delay-150 ${isActive ? "scale-100" : "scale-75"}`} />
    </div>
    <div className="text-center space-y-4 flex-1 flex flex-col justify-center">
      <div className={`text-sm text-muted-foreground transition-all duration-500 ${isActive ? "opacity-100 translate-y-0" : "opacity-50 -translate-y-2"}`}>Share your job link</div>
      <div className={`h-12 rounded-lg bg-muted/50 flex items-center justify-between px-4 gap-2 transition-all duration-700 ${isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"}`}>
        <span className="text-xs text-foreground truncate">candidateassess.com/apply/senior-react...</span>
        <div className={`px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium shrink-0 transition-all duration-500 ${isActive ? "scale-100" : "scale-90"}`}>
          Copy
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 pt-4">
        {[
          { bg: "bg-[#0077B5]/20", text: "text-[#0077B5]", label: "in" },
          { bg: "bg-[#1DA1F2]/20", text: "text-[#1DA1F2]", label: "X" },
          { bg: "bg-muted", text: "text-muted-foreground", label: "@" },
        ].map((social, i) => (
          <div 
            key={i}
            className={`w-10 h-10 rounded-full ${social.bg} flex items-center justify-center transition-all duration-500`}
            style={{
              transform: isActive ? "scale(1) translateY(0)" : `scale(0.8) translateY(${10 + i * 5}px)`,
              opacity: isActive ? 1 : 0.5,
              transitionDelay: `${i * 100}ms`,
            }}
          >
            <span className={`${social.text} text-xs font-bold`}>{social.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AssessMockup = ({ isActive }: { isActive: boolean }) => (
  <div className="h-full flex flex-col gap-3">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-3 h-3 rounded-full bg-destructive/60 transition-transform duration-500 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-yellow-500/60 transition-transform duration-500 delay-75 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-green-500/60 transition-transform duration-500 delay-150 ${isActive ? "scale-100" : "scale-75"}`} />
    </div>
    <div className={`text-xs text-muted-foreground uppercase tracking-wider transition-all duration-500 ${isActive ? "opacity-100" : "opacity-50"}`}>Question 3 of 15</div>
    <div className={`p-3 rounded-lg bg-muted/30 transition-all duration-500 ${isActive ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-70"}`}>
      <p className="text-sm text-foreground">What is the purpose of useCallback in React?</p>
    </div>
    <div className="space-y-2 flex-1">
      {["Memoize functions", "Manage state", "Handle effects", "Create refs"].map((opt, i) => (
        <div 
          key={i} 
          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 transition-all duration-500 ${
            i === 0 
              ? "bg-primary/20 border border-primary/50 text-foreground" 
              : "bg-muted/50 text-muted-foreground"
          }`}
          style={{
            transform: isActive ? "translateX(0)" : `translateX(${-10 - i * 5}px)`,
            opacity: isActive ? 1 : 0.5,
            transitionDelay: `${i * 75}ms`,
          }}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            i === 0 ? "border-primary bg-primary" : "border-muted-foreground/30"
          }`}>
            {i === 0 && <Check className={`w-2.5 h-2.5 text-primary-foreground transition-transform duration-500 ${isActive ? "scale-100" : "scale-0"}`} />}
          </div>
          {opt}
        </div>
      ))}
    </div>
  </div>
);

const HireMockup = ({ isActive }: { isActive: boolean }) => (
  <div className="h-full flex flex-col gap-3">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-3 h-3 rounded-full bg-destructive/60 transition-transform duration-500 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-yellow-500/60 transition-transform duration-500 delay-75 ${isActive ? "scale-100" : "scale-75"}`} />
      <div className={`w-3 h-3 rounded-full bg-green-500/60 transition-transform duration-500 delay-150 ${isActive ? "scale-100" : "scale-75"}`} />
    </div>
    <div className={`text-xs text-muted-foreground uppercase tracking-wider transition-all duration-500 ${isActive ? "opacity-100" : "opacity-50"}`}>Top Candidates</div>
    <div className="space-y-2 flex-1">
      {[
        { name: "Sarah Chen", score: 94, badge: "🏆" },
        { name: "Alex Johnson", score: 87, badge: "" },
        { name: "Maria Garcia", score: 82, badge: "" },
      ].map((candidate, i) => (
        <div 
          key={i} 
          className="p-3 rounded-lg bg-muted/50 flex items-center justify-between transition-all duration-500"
          style={{
            transform: isActive ? "translateY(0) scale(1)" : `translateY(${10 + i * 5}px) scale(0.95)`,
            opacity: isActive ? 1 : 0.5,
            transitionDelay: `${i * 100}ms`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-pink/30 flex items-center justify-center text-xs font-medium transition-transform duration-500 ${isActive ? "scale-100 rotate-0" : "scale-75 rotate-12"}`}>
              {candidate.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground flex items-center gap-1">
                {candidate.name} {candidate.badge && <span className={`transition-transform duration-700 ${isActive ? "scale-100" : "scale-0"}`}>{candidate.badge}</span>}
              </div>
              <div className="text-xs text-muted-foreground">Senior Developer</div>
            </div>
          </div>
          <div className={`text-lg font-bold transition-all duration-500 ${i === 0 ? "text-primary" : "text-muted-foreground"} ${isActive ? "scale-100" : "scale-75"}`}>
            {candidate.score}%
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-end">
      <div className={`px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium transition-all duration-700 ${isActive ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-90"}`}>
        Send Offer Letter
      </div>
    </div>
  </div>
);

export default HowItWorks;
