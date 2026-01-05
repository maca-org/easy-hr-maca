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
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-slide every 2.5 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;

  return (
    <div 
      ref={sectionRef}
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Sticky Toolbar */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-12">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            className={`
              relative px-4 md:px-6 py-3 rounded-full font-medium text-sm md:text-base
              transition-all duration-300 ease-out overflow-hidden
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
      <div className="flex items-center justify-center gap-2 mb-8">
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

      {/* Content Area */}
      <div className="max-w-5xl mx-auto">
        <div 
          key={activeStep}
          className="grid md:grid-cols-2 gap-8 md:gap-12 items-center animate-fade-in"
        >
          {/* Visual Mockup */}
          <div className="order-2 md:order-1">
            <div className={`
              relative aspect-[4/3] rounded-3xl overflow-hidden
              bg-gradient-to-br ${currentStep.color}
              p-1 shadow-2xl shadow-primary/20
            `}>
              <div className="absolute inset-1 rounded-[20px] bg-background/95 backdrop-blur-sm p-6 md:p-8">
                {/* Mockup Content based on step */}
                {activeStep === 0 && <CreateMockup />}
                {activeStep === 1 && <ShareMockup />}
                {activeStep === 2 && <AssessMockup />}
                {activeStep === 3 && <HireMockup />}
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="order-1 md:order-2 space-y-6 text-center md:text-left">
            <div className={`
              inline-flex items-center justify-center w-16 h-16 rounded-2xl
              bg-gradient-to-br ${currentStep.color}
              shadow-lg
            `}>
              <StepIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary uppercase tracking-wider">
                Step {activeStep + 1} of {steps.length}
              </p>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                {currentStep.subtitle}
              </h3>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto md:mx-0">
              {currentStep.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mockup Components
const CreateMockup = () => (
  <div className="h-full flex flex-col gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-3 h-3 rounded-full bg-destructive/60" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
      <div className="w-3 h-3 rounded-full bg-green-500/60" />
    </div>
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Job Title</div>
      <div className="h-10 rounded-lg bg-muted/50 flex items-center px-4">
        <span className="text-sm text-foreground">Senior React Developer</span>
      </div>
    </div>
    <div className="space-y-3 flex-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Description</div>
      <div className="h-full min-h-[80px] rounded-lg bg-muted/50 p-4">
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-4/5" />
          <div className="h-2 bg-muted rounded w-3/4" />
        </div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
        <Check className="w-4 h-4" />
        Create Job
      </div>
    </div>
  </div>
);

const ShareMockup = () => (
  <div className="h-full flex flex-col gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-3 h-3 rounded-full bg-destructive/60" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
      <div className="w-3 h-3 rounded-full bg-green-500/60" />
    </div>
    <div className="text-center space-y-4 flex-1 flex flex-col justify-center">
      <div className="text-sm text-muted-foreground">Share your job link</div>
      <div className="h-12 rounded-lg bg-muted/50 flex items-center justify-between px-4 gap-2">
        <span className="text-xs text-foreground truncate">candidateassess.com/apply/senior-react...</span>
        <div className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium shrink-0">
          Copy
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 pt-4">
        <div className="w-10 h-10 rounded-full bg-[#0077B5]/20 flex items-center justify-center">
          <span className="text-[#0077B5] text-xs font-bold">in</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center">
          <span className="text-[#1DA1F2] text-xs font-bold">X</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-xs font-bold">@</span>
        </div>
      </div>
    </div>
  </div>
);

const AssessMockup = () => (
  <div className="h-full flex flex-col gap-3">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-3 h-3 rounded-full bg-destructive/60" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
      <div className="w-3 h-3 rounded-full bg-green-500/60" />
    </div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider">Question 3 of 15</div>
    <div className="p-3 rounded-lg bg-muted/30">
      <p className="text-sm text-foreground">What is the purpose of useCallback in React?</p>
    </div>
    <div className="space-y-2 flex-1">
      {["Memoize functions", "Manage state", "Handle effects", "Create refs"].map((opt, i) => (
        <div 
          key={i} 
          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
            i === 0 
              ? "bg-primary/20 border border-primary/50 text-foreground" 
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            i === 0 ? "border-primary bg-primary" : "border-muted-foreground/30"
          }`}>
            {i === 0 && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </div>
          {opt}
        </div>
      ))}
    </div>
  </div>
);

const HireMockup = () => (
  <div className="h-full flex flex-col gap-3">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-3 h-3 rounded-full bg-destructive/60" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
      <div className="w-3 h-3 rounded-full bg-green-500/60" />
    </div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider">Top Candidates</div>
    <div className="space-y-2 flex-1">
      {[
        { name: "Sarah Chen", score: 94, badge: "🏆" },
        { name: "Alex Johnson", score: 87, badge: "" },
        { name: "Maria Garcia", score: 82, badge: "" },
      ].map((candidate, i) => (
        <div key={i} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-pink/30 flex items-center justify-center text-xs font-medium">
              {candidate.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground flex items-center gap-1">
                {candidate.name} {candidate.badge}
              </div>
              <div className="text-xs text-muted-foreground">Senior Developer</div>
            </div>
          </div>
          <div className={`text-lg font-bold ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
            {candidate.score}%
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-end">
      <div className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium">
        Send Offer Letter
      </div>
    </div>
  </div>
);

export default HowItWorks;
