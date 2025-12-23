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
import AssessmentSettings from "./pages/AssessmentSettings";
import Assessment from "./pages/Assessment";
import JobApplication from "./pages/JobApplication";
import SubscriptionSettings from "./pages/SubscriptionSettings";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import Authors from "./pages/Authors";
import AuthorProfile from "./pages/AuthorProfile";
import Admin from "./pages/Admin";

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
          <Route path="/questions-review" element={<QuestionsReview />} />
          <Route path="/candidates-dashboard" element={<CandidatesDashboard />} />
          <Route path="/assessment-settings" element={<AssessmentSettings />} />
          <Route path="/assessment/:candidateId" element={<Assessment />} />
          <Route path="/apply/:jobId" element={<JobApplication />} />
          <Route path="/settings/subscription" element={<SubscriptionSettings />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/authors/:id" element={<AuthorProfile />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
