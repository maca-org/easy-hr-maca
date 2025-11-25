import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Mail, Phone } from "lucide-react";

export const CandidateDetails = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("id");
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Placeholder data - will be replaced with actual data later
  const candidate = {
    email: "candidate@example.com",
    phone: "+1 (555) 123-4567",
    strengths: [
      "Strong technical skills in React and TypeScript",
      "Excellent communication abilities",
      "5+ years of relevant experience",
      "Proven track record of delivering projects on time"
    ],
    weaknesses: [
      "Limited experience with backend technologies",
      "No formal cloud certification",
      "Gaps in project management experience"
    ],
    matches: [
      "Proficient in React and modern JavaScript frameworks",
      "Experience with agile development methodologies",
      "Strong problem-solving skills demonstrated in portfolio"
    ],
    mismatches: [
      "Required AWS certification not present",
      "Preferred 7+ years experience vs 5 years actual",
      "Limited experience with microservices architecture"
    ],
    summary: "This candidate shows strong technical capabilities and communication skills that align well with the core requirements. While there are some gaps in advanced backend and cloud infrastructure experience, their demonstrated ability to learn quickly and solid foundation in frontend development make them a promising candidate worth interviewing."
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex flex-col px-8 py-6 space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(`/questions-review?id=${jobId}`)}
            className="mb-4"
          >
            ← Back to Questions
          </Button>
          <h1 className="text-2xl font-bold text-foreground mb-2">Candidate Details</h1>
          <p className="text-muted-foreground">Review candidate information and AI-generated insights</p>
        </div>

        {/* AI Preview Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">AI Preview</h2>
          <p className="text-muted-foreground mb-4">
            Our AI has analyzed this candidate's profile against your job requirements. 
            Click below to view detailed insights including strengths, weaknesses, and job fit analysis.
          </p>
          
          <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {insightsOpen ? "Hide AI Insights" : "Show AI Insights"}
                <ChevronDown className={`transition-transform ${insightsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-6 space-y-6">
              {/* Strengths */}
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span> Candidate Strengths
                </h3>
                <ul className="space-y-2 ml-6">
                  {candidate.strengths.map((strength, idx) => (
                    <li key={idx} className="text-foreground list-disc">{strength}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-amber-600">⚠</span> Areas for Development
                </h3>
                <ul className="space-y-2 ml-6">
                  {candidate.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-foreground list-disc">{weakness}</li>
                  ))}
                </ul>
              </div>

              {/* Matches */}
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Matches with Job Requirements
                </h3>
                <ul className="space-y-2 ml-6">
                  {candidate.matches.map((match, idx) => (
                    <li key={idx} className="text-foreground list-disc">{match}</li>
                  ))}
                </ul>
              </div>

              {/* Mismatches */}
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-red-600">✗</span> Mismatches with Job Requirements
                </h3>
                <ul className="space-y-2 ml-6">
                  {candidate.mismatches.map((mismatch, idx) => (
                    <li key={idx} className="text-foreground list-disc">{mismatch}</li>
                  ))}
                </ul>
              </div>

              {/* AI Summary */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-foreground mb-3">AI Summary</h3>
                <p className="text-foreground leading-relaxed">{candidate.summary}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-foreground font-medium">{candidate.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="text-foreground font-medium">{candidate.phone}</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button asChild className="flex-1">
            <a href={`mailto:${candidate.email}`}>
              <Mail className="mr-2" />
              Send Email
            </a>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={`tel:${candidate.phone}`}>
              <Phone className="mr-2" />
              Call Candidate
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
