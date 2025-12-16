import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { QuestionsReview } from "./pages/QuestionsReview";
import CandidatesDashboard from "./pages/CandidatesDashboard";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AssessmentSettings from "./pages/AssessmentSettings";
import Assessment from "./pages/Assessment";
import ApplyJob from "./pages/ApplyJob";
import CandidateAuth from "./pages/CandidateAuth";
import CandidatePortal from "./pages/CandidatePortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/jobs" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/questions-review" element={<QuestionsReview />} />
          <Route path="/candidates-dashboard" element={<CandidatesDashboard />} />
          <Route path="/assessment-settings" element={<AssessmentSettings />} />
          <Route path="/assessment/:candidateId" element={<Assessment />} />
          <Route path="/apply/:jobId" element={<ApplyJob />} />
          <Route path="/candidate-auth" element={<CandidateAuth />} />
          <Route path="/candidate-portal" element={<CandidatePortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
