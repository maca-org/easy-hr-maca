import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Copy, Download, FileText, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface OfferLetterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  preselectedCandidateId?: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  hrName: string;
}

type PayPeriod = "monthly" | "yearly";
type EmploymentType = "full-time" | "part-time" | "internship";
type WorkModel = "on-site" | "hybrid" | "remote";
type DurationUnit = "month" | "year";

interface OfferFormData {
  candidateId: string;
  companyName: string;
  jobTitle: string;
  salaryAmount: string;
  currency: string;
  payPeriod: PayPeriod;
  employmentType: EmploymentType;
  workModel: WorkModel;
  isContracted: boolean;
  contractDurationValue: string;
  contractDurationUnit: DurationUnit;
  validUntil: Date | undefined;
}

export function OfferLetterDrawer({
  isOpen,
  onClose,
  candidates,
  preselectedCandidateId,
  jobId,
  jobTitle,
  companyName,
  hrName
}: OfferLetterDrawerProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    candidateId: preselectedCandidateId || "",
    companyName: companyName || "",
    jobTitle: jobTitle || "",
    salaryAmount: "",
    currency: "USD",
    payPeriod: "monthly",
    employmentType: "full-time",
    workModel: "on-site",
    isContracted: false,
    contractDurationValue: "",
    contractDurationUnit: "month",
    validUntil: undefined
  });

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update form when props change
  useEffect(() => {
    if (preselectedCandidateId) {
      setFormData(prev => ({ ...prev, candidateId: preselectedCandidateId }));
    }
  }, [preselectedCandidateId]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      companyName: companyName || prev.companyName,
      jobTitle: jobTitle || prev.jobTitle
    }));
  }, [companyName, jobTitle]);

  // Load existing draft when candidate changes
  useEffect(() => {
    const loadDraft = async () => {
      if (!formData.candidateId || !jobId) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: existingOffer } = await supabase
        .from("offer_letters")
        .select("*")
        .eq("hr_user_id", user.user.id)
        .eq("candidate_id", formData.candidateId)
        .eq("job_id", jobId)
        .maybeSingle();

      if (existingOffer) {
        setFormData(prev => ({
          ...prev,
          companyName: existingOffer.company_name,
          jobTitle: existingOffer.job_title,
          salaryAmount: existingOffer.salary_amount?.toString() || "",
          currency: existingOffer.currency || "USD",
          payPeriod: (existingOffer.pay_period as PayPeriod) || "monthly",
          employmentType: (existingOffer.employment_type as EmploymentType) || "full-time",
          workModel: (existingOffer.work_model as WorkModel) || "on-site",
          isContracted: existingOffer.is_contracted || false,
          contractDurationValue: existingOffer.contract_duration_value?.toString() || "",
          contractDurationUnit: (existingOffer.contract_duration_unit as DurationUnit) || "month",
          validUntil: existingOffer.valid_until ? new Date(existingOffer.valid_until) : undefined
        }));
      }
    };

    loadDraft();
  }, [formData.candidateId, jobId]);

  const selectedCandidate = candidates.find(c => c.id === formData.candidateId);

  const saveDraft = async () => {
    if (!formData.candidateId || !formData.salaryAmount) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase
      .from("offer_letters")
      .upsert({
        hr_user_id: user.user.id,
        candidate_id: formData.candidateId,
        job_id: jobId,
        company_name: formData.companyName,
        job_title: formData.jobTitle,
        salary_amount: parseFloat(formData.salaryAmount),
        currency: formData.currency,
        pay_period: formData.payPeriod,
        employment_type: formData.employmentType,
        work_model: formData.workModel,
        is_contracted: formData.isContracted,
        contract_duration_value: formData.isContracted ? parseInt(formData.contractDurationValue) || null : null,
        contract_duration_unit: formData.isContracted ? formData.contractDurationUnit : null,
        valid_until: formData.validUntil ? format(formData.validUntil, "yyyy-MM-dd") : null
      }, { 
        onConflict: "hr_user_id,candidate_id,job_id" 
      });

    if (error) {
      console.error("Error saving draft:", error);
    }
  };

  const generateEmailTemplate = () => {
    const candidateName = selectedCandidate?.name || "Candidate";
    const payPeriodText = formData.payPeriod === "monthly" ? "Monthly" : "Yearly";
    const employmentText = formData.employmentType.charAt(0).toUpperCase() + formData.employmentType.slice(1).replace("-", " ");
    const workModelText = formData.workModel.charAt(0).toUpperCase() + formData.workModel.slice(1);

    const subject = `Offer Letter – ${formData.jobTitle} at ${formData.companyName}`;

    let body = `Hi ${candidateName},

We're excited to offer you the ${formData.jobTitle} position at ${formData.companyName}.

Compensation: ${parseFloat(formData.salaryAmount).toLocaleString()} ${formData.currency} / ${payPeriodText}
Employment type: ${employmentText}
Work model: ${workModelText}`;

    if (formData.isContracted && formData.contractDurationValue) {
      const unit = formData.contractDurationUnit;
      const plural = parseInt(formData.contractDurationValue) > 1 ? "s" : "";
      body += `\nContract duration: ${formData.contractDurationValue} ${unit}${plural}`;
    }

    if (formData.validUntil) {
      body += `\n\nPlease respond by ${format(formData.validUntil, "MMMM d, yyyy")}.`;
    }

    body += `

Your offer letter is attached.

Best regards,
${hrName}
${formData.companyName}

---
Prepared with Candidate Assess
candidateassess.com`;

    return { subject, body };
  };

  const handleCopyEmail = async () => {
    if (!formData.candidateId || !formData.salaryAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    await saveDraft();

    const { subject, body } = generateEmailTemplate();
    const fullText = `Subject: ${subject}\n\n${body}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Email template copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownloadPDF = async () => {
    if (!formData.candidateId || !formData.salaryAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    await saveDraft();

    try {
      const candidateName = selectedCandidate?.name || "Candidate";
      const doc = new jsPDF();

      // Header
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Offer Letter", 105, 25, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(formData.companyName, 20, 45);
      doc.text(`Date: ${format(new Date(), "MMMM d, yyyy")}`, 20, 52);

      // Candidate greeting
      doc.setFontSize(12);
      doc.text(`Dear ${candidateName},`, 20, 70);

      // Body
      const bodyText = `We are pleased to offer you the position of ${formData.jobTitle} at ${formData.companyName}. We believe your skills and experience will be a valuable addition to our team.`;
      const splitBody = doc.splitTextToSize(bodyText, 170);
      doc.text(splitBody, 20, 82);

      // Terms section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Terms of Employment:", 20, 105);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const payPeriodText = formData.payPeriod === "monthly" ? "month" : "year";
      const employmentText = formData.employmentType.charAt(0).toUpperCase() + formData.employmentType.slice(1).replace("-", " ");
      const workModelText = formData.workModel.charAt(0).toUpperCase() + formData.workModel.slice(1);

      const terms = [
        `Position: ${formData.jobTitle}`,
        `Compensation: ${parseFloat(formData.salaryAmount).toLocaleString()} ${formData.currency} per ${payPeriodText}`,
        `Employment Type: ${employmentText}`,
        `Work Model: ${workModelText}`
      ];

      if (formData.isContracted && formData.contractDurationValue) {
        const unit = formData.contractDurationUnit;
        const plural = parseInt(formData.contractDurationValue) > 1 ? "s" : "";
        terms.push(`Contract Duration: ${formData.contractDurationValue} ${unit}${plural}`);
      }

      if (formData.validUntil) {
        terms.push(`This offer is valid until: ${format(formData.validUntil, "MMMM d, yyyy")}`);
      }

      terms.forEach((term, idx) => {
        doc.text(`• ${term}`, 25, 115 + idx * 8);
      });

      // Closing
      const yPos = 115 + terms.length * 8 + 20;

      const closingText = "We are confident that you will find this opportunity both challenging and rewarding. Please sign and return this letter to confirm your acceptance.";
      const splitClosing = doc.splitTextToSize(closingText, 170);
      doc.text(splitClosing, 20, yPos);

      // Signatures
      const sigY = yPos + 30;

      doc.text("Sincerely,", 20, sigY);
      doc.text("_____________________________", 20, sigY + 15);
      doc.text(hrName, 20, sigY + 23);
      doc.text(formData.companyName, 20, sigY + 30);

      // Add branding footer
      const footerY = sigY + 50;
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text("Prepared with Candidate Assess", 105, footerY, { align: "center" });
      doc.text("candidateassess.com", 105, footerY + 5, { align: "center" });
      doc.setTextColor(0, 0, 0);

      doc.text("Accepted by:", 120, sigY);
      doc.text("_____________________________", 120, sigY + 15);
      doc.text("Candidate Signature", 120, sigY + 23);
      doc.text("Date: _______________", 120, sigY + 30);

      // Download
      const fileName = `Offer_Letter_${candidateName.replace(/\s+/g, "_")}_${formData.jobTitle.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);

      toast.success("Offer letter PDF downloaded!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.candidateId && formData.salaryAmount && formData.companyName && formData.jobTitle;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prepare Offer Letter
          </SheetTitle>
          <SheetDescription>
            Create an offer letter for a candidate
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Step 1: Select Candidate */}
          <div className="space-y-2">
            <Label htmlFor="candidate">Select Candidate *</Label>
            <Select
              value={formData.candidateId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, candidateId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Offer Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="Enter job title"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Amount *</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salaryAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, salaryAmount: e.target.value }))}
                  placeholder="e.g. 75000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="e.g. USD, EUR, TRY"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pay Period</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.payPeriod === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, payPeriod: "monthly" }))}
                  className="flex-1"
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  variant={formData.payPeriod === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, payPeriod: "yearly" }))}
                  className="flex-1"
                >
                  Yearly
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Employment Type</Label>
              <div className="flex gap-2">
                {(["full-time", "part-time", "internship"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.employmentType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, employmentType: type }))}
                    className="flex-1"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Model</Label>
              <div className="flex gap-2">
                {(["on-site", "hybrid", "remote"] as const).map((model) => (
                  <Button
                    key={model}
                    type="button"
                    variant={formData.workModel === model ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, workModel: model }))}
                    className="flex-1"
                  >
                    {model.charAt(0).toUpperCase() + model.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="contracted">Contracted?</Label>
              <Switch
                id="contracted"
                checked={formData.isContracted}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isContracted: checked }))}
              />
            </div>

            {formData.isContracted && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.contractDurationValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractDurationValue: e.target.value }))}
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationUnit">Unit</Label>
                  <Select
                    value={formData.contractDurationUnit}
                    onValueChange={(value: DurationUnit) => setFormData(prev => ({ ...prev, contractDurationUnit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month(s)</SelectItem>
                      <SelectItem value="year">Year(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Offer Valid Until (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validUntil ? format(formData.validUntil, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validUntil}
                    onSelect={(date) => setFormData(prev => ({ ...prev, validUntil: date }))}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            <Button
              onClick={handleCopyEmail}
              disabled={!isFormValid}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Email Template
                </>
              )}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={!isFormValid || loading}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Download Offer Letter (PDF)"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
