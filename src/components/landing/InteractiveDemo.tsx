import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Upload, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  Loader2,
  Briefcase,
  FileQuestion,
  Check
} from "lucide-react";

type DemoStep = 'job' | 'assessment' | 'cv' | 'analyzing' | 'ready';

interface DemoData {
  jobTitle: string;
  jobDescription: string;
  cvFileName: string;
  cvFileBase64: string;
}

interface SampleQuestion {
  question: string;
  options: string[];
  correct: number;
}

const getSampleQuestion = (jobDesc: string): SampleQuestion => {
  const desc = jobDesc.toLowerCase();
  
  if (desc.includes('react') || desc.includes('frontend') || desc.includes('javascript')) {
    return {
      question: "Which React hook is best suited for managing complex state logic with multiple sub-values?",
      options: ["useState", "useReducer", "useContext", "useRef"],
      correct: 1
    };
  } else if (desc.includes('python') || desc.includes('data') || desc.includes('machine learning')) {
    return {
      question: "Which Python library is most commonly used for data manipulation and analysis?",
      options: ["NumPy", "Pandas", "Matplotlib", "Requests"],
      correct: 1
    };
  } else if (desc.includes('java') || desc.includes('backend') || desc.includes('spring')) {
    return {
      question: "What design pattern is Spring Framework's dependency injection based on?",
      options: ["Singleton", "Factory", "Inversion of Control", "Observer"],
      correct: 2
    };
  } else if (desc.includes('marketing') || desc.includes('digital') || desc.includes('social media')) {
    return {
      question: "Which metric best indicates the effectiveness of an email marketing campaign?",
      options: ["Impressions", "Click-through rate", "Bounce rate", "Page views"],
      correct: 1
    };
  } else if (desc.includes('sales') || desc.includes('account') || desc.includes('customer')) {
    return {
      question: "What is the most effective approach to handle customer objections?",
      options: ["Ignore and redirect", "Listen and acknowledge", "Offer discounts", "End the call"],
      correct: 1
    };
  } else if (desc.includes('design') || desc.includes('ui') || desc.includes('ux')) {
    return {
      question: "What principle ensures that similar elements are perceived as related?",
      options: ["Contrast", "Proximity", "Hierarchy", "Balance"],
      correct: 1
    };
  } else {
    return {
      question: "What is the most important factor when evaluating a candidate's cultural fit?",
      options: ["Technical skills", "Years of experience", "Values alignment", "Salary expectations"],
      correct: 2
    };
  }
};

export const InteractiveDemo = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<DemoStep>('job');
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleQuestion = useMemo(() => getSampleQuestion(jobDescription), [jobDescription]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
    }
  };

  const handleNext = async () => {
    if (step === 'job') {
      if (!jobTitle.trim() || !jobDescription.trim()) return;
      setStep('assessment');
    } else if (step === 'assessment') {
      setStep('cv');
    } else if (step === 'cv') {
      if (!cvFile) return;
      
      // Convert file to base64 and store in sessionStorage
      const reader = new FileReader();
      reader.onload = () => {
        const demoData: DemoData = {
          jobTitle,
          jobDescription,
          cvFileName: cvFile.name,
          cvFileBase64: reader.result as string
        };
        sessionStorage.setItem('demoData', JSON.stringify(demoData));
        
        // Start analyzing animation
        setStep('analyzing');
        
        // After 3 seconds, show ready state
        setTimeout(() => {
          setStep('ready');
        }, 3000);
      };
      reader.readAsDataURL(cvFile);
    }
  };

  const handleShowAnalysis = () => {
    // Redirect to auth page - demo data is in sessionStorage
    navigate('/auth');
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 gradient-bg rounded-[2.5rem] blur-3xl opacity-60" />
      <div className="relative glass rounded-[2rem] p-8 animate-float">
        {/* Step: Job Details */}
        {step === 'job' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Try it now</h3>
                <p className="text-xs text-muted-foreground">Step 1: Describe the role</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="demo-title" className="text-sm">Job Title</Label>
                <Input
                  id="demo-title"
                  placeholder="e.g. Senior Frontend Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-desc" className="text-sm">Job Description</Label>
                <Textarea
                  id="demo-desc"
                  placeholder="Describe the role, required skills, and responsibilities..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="bg-background/50 resize-none"
                />
              </div>
            </div>

            <Button 
              onClick={handleNext}
              disabled={!jobTitle.trim() || !jobDescription.trim()}
              className="w-full gap-2"
            >
              Generate Assessment
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Assessment Ready */}
        {step === 'assessment' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Assessment Ready!</h3>
                <p className="text-xs text-muted-foreground">Step 2: AI generated questions</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span className="font-medium text-foreground">Role:</span> {jobTitle}
            </div>

            {/* Sample Question */}
            <div className="bg-background/50 border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileQuestion className="w-4 h-4 text-primary" />
                Sample Question
              </div>
              <p className="text-sm text-foreground">{sampleQuestion.question}</p>
              <div className="space-y-2">
                {sampleQuestion.options.map((option, i) => (
                  <div 
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                      i === sampleQuestion.correct 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400' 
                        : 'bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      i === sampleQuestion.correct 
                        ? 'border-green-500 bg-green-500' 
                        : 'border-muted-foreground/50'
                    }`}>
                      {i === sampleQuestion.correct && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {option}
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Summary */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 rounded-lg p-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">15 MCQs</strong> + <strong className="text-foreground">4 open-ended</strong> questions ready!</span>
            </div>

            <Button onClick={handleNext} className="w-full gap-2">
              Next: Upload CV
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: CV Upload */}
        {step === 'cv' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Upload Resume</h3>
                <p className="text-xs text-muted-foreground">Step 3: Add a candidate CV</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mb-4">
              <span className="font-medium text-foreground">Role:</span> {jobTitle}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {cvFile ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{cvFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload PDF or DOC
                  </p>
                </>
              )}
            </div>

            <Button 
              onClick={handleNext}
              disabled={!cvFile}
              className="w-full gap-2"
            >
              Analyze CV
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="space-y-6 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Analyzing CV...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI is evaluating the candidate
              </p>
            </div>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '600ms' }} />
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === 'ready' && (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Analysis Ready!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                CV score & questions are generated
              </p>
            </div>

            {/* Mock preview */}
            <div className="bg-muted/30 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CV Match Score</span>
                <span className="font-semibold text-primary">85%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-pink rounded-full" style={{ width: "85%" }} />
              </div>
              <p className="text-xs text-muted-foreground">
                + 10 role-specific questions generated
              </p>
            </div>

            <Button 
              onClick={handleShowAnalysis}
              className="w-full gap-2"
            >
              Sign up to see full analysis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
