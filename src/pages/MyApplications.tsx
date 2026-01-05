import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Briefcase, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  LogOut,
  ExternalLink,
  User,
  Play,
  Building2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface Application {
  id: string;
  name: string;
  email: string;
  cv_rate: number;
  applied_at: string | null;
  assessment_sent: boolean;
  assessment_sent_at: string | null;
  assessment_due_date: string | null;
  completed_test: boolean;
  test_completed_at: string | null;
  test_result: number | null;
  job_openings: {
    id: string;
    title: string | null;
    description: string;
  } | null;
}

interface RecommendedJob {
  id: string;
  title: string | null;
  description: string;
  slug: string | null;
  company_name: string;
  created_at: string;
}

const MyApplications = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [applyingToJob, setApplyingToJob] = useState<string | null>(null);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check account type - redirect HR to jobs
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.account_type === 'hr') {
          navigate('/jobs');
          return;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch applications when user is authenticated
  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First get the applications
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select(`
            id,
            name,
            email,
            cv_rate,
            applied_at,
            assessment_sent,
            assessment_sent_at,
            assessment_due_date,
            completed_test,
            test_completed_at,
            test_result,
            job_id
          `)
          .eq('applicant_user_id', user.id)
          .order('applied_at', { ascending: false });

        if (candidatesError) throw candidatesError;

        if (!candidatesData || candidatesData.length === 0) {
          setApplications([]);
          setLoading(false);
          return;
        }

        // Get unique job IDs
        const jobIds = [...new Set(candidatesData.map(c => c.job_id))];
        
        // Fetch job openings separately (service role can access)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-candidate-jobs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobIds }),
          }
        );

        let jobsMap: Record<string, { id: string; title: string | null; description: string }> = {};
        
        if (response.ok) {
          const jobsData = await response.json();
          jobsMap = (jobsData || []).reduce((acc: Record<string, any>, job: any) => {
            acc[job.id] = job;
            return acc;
          }, {});
        }

        // Combine data
        const applicationsWithJobs: Application[] = candidatesData.map(candidate => ({
          ...candidate,
          job_openings: jobsMap[candidate.job_id] || null
        }));

        setApplications(applicationsWithJobs);
      } catch (error) {
        console.error('Error fetching applications:', error);
        toast.error('Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApplications();
      fetchRecommendedJobs();
    }
  }, [user]);

  // Fetch recommended jobs
  const fetchRecommendedJobs = async () => {
    if (!user) return;
    
    try {
      // Get user's existing applications to exclude
      const { data: userApps } = await supabase
        .from('candidates')
        .select('job_id')
        .eq('applicant_user_id', user.id);
      
      const excludeJobIds = userApps?.map(app => app.job_id) || [];
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-open-jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excludeJobIds }),
        }
      );
      
      if (response.ok) {
        const jobs = await response.json();
        setRecommendedJobs(jobs.slice(0, 5)); // Show max 5 recommendations
      }
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
    }
  };

  // Quick apply to a job
  const handleQuickApply = async (job: RecommendedJob) => {
    if (!user) return;
    
    setApplyingToJob(job.id);
    
    try {
      // Get user's profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();
      
      // Create a candidate record for this job
      const { error } = await supabase
        .from('candidates')
        .insert({
          job_id: job.id,
          applicant_user_id: user.id,
          user_id: job.id, // This will be the job owner's user_id, we'll update it
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Candidate',
          email: user.email || '',
          cv_rate: 0,
          application_source: 'self_applied',
          applied_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Apply error:', error);
        toast.error('Failed to apply. Please try again.');
      } else {
        toast.success(`Applied to ${job.title || 'the job'}!`);
        // Refresh both lists
        fetchRecommendedJobs();
        // Trigger applications refresh
        const { data: candidatesData } = await supabase
          .from('candidates')
          .select(`
            id,
            name,
            email,
            cv_rate,
            applied_at,
            assessment_sent,
            assessment_sent_at,
            assessment_due_date,
            completed_test,
            test_completed_at,
            test_result,
            job_id
          `)
          .eq('applicant_user_id', user.id)
          .order('applied_at', { ascending: false });
        
        if (candidatesData) {
          const jobIds = [...new Set(candidatesData.map(c => c.job_id))];
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-candidate-jobs`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobIds }),
            }
          );
          
          let jobsMap: Record<string, any> = {};
          if (response.ok) {
            const jobsData = await response.json();
            jobsMap = (jobsData || []).reduce((acc: Record<string, any>, job: any) => {
              acc[job.id] = job;
              return acc;
            }, {});
          }
          
          const applicationsWithJobs: Application[] = candidatesData.map(candidate => ({
            ...candidate,
            job_openings: jobsMap[candidate.job_id] || null
          }));
          
          setApplications(applicationsWithJobs);
        }
      }
    } catch (error) {
      console.error('Quick apply error:', error);
      toast.error('Failed to apply. Please try again.');
    } finally {
      setApplyingToJob(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast.info('Logged out successfully');
  };

  const getApplicationStatus = (app: Application) => {
    if (app.completed_test && app.test_result !== null) {
      return {
        label: 'Assessment Completed',
        variant: 'default' as const,
        icon: CheckCircle,
        color: 'text-green-600'
      };
    }
    if (app.assessment_sent) {
      const dueDate = app.assessment_due_date ? new Date(app.assessment_due_date) : null;
      const isOverdue = dueDate && dueDate < new Date();
      
      if (isOverdue) {
        return {
          label: 'Assessment Overdue',
          variant: 'destructive' as const,
          icon: AlertCircle,
          color: 'text-red-600'
        };
      }
      return {
        label: 'Assessment Pending',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-yellow-600'
      };
    }
    return {
      label: 'Under Review',
      variant: 'outline' as const,
      icon: FileText,
      color: 'text-blue-600'
    };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Login Required</h1>
            <p className="text-muted-foreground mb-6">
              Please login to view your applications.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Applications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track the status of your job applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        {/* Coming Soon Message */}
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The My Applications dashboard is currently under development. 
              You'll soon be able to track all your job applications here.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Powered by Lovable
        </p>
      </div>
    </div>
  );
};

export default MyApplications;