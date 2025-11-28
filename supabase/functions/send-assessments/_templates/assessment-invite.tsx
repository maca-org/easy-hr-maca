import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface AssessmentInviteEmailProps {
  candidateName: string
  jobTitle: string
  assessmentLink: string
  dueDate: string
  companyName: string
}

export const AssessmentInviteEmail = ({
  candidateName,
  jobTitle,
  assessmentLink,
  dueDate,
  companyName,
}: AssessmentInviteEmailProps) => (
  <Html>
    <Head />
    <Preview>Complete your assessment for {jobTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{companyName}</Heading>
        </Section>
        
        <Section style={content}>
          <Text style={greeting}>Hi {candidateName},</Text>
          
          <Text style={paragraph}>
            You've been invited to complete an assessment for the <strong>{jobTitle}</strong> position at {companyName}.
          </Text>
          
          <Text style={paragraph}>
            This assessment will help us understand your skills and experience better. Please complete it by:
          </Text>
          
          <Section style={dueDateBox}>
            <Text style={dueDateText}>{dueDate}</Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Button href={assessmentLink} style={button}>
              Start Assessment
            </Button>
          </Section>
          
          <Text style={paragraph}>
            Or copy and paste this link into your browser:
          </Text>
          <Link href={assessmentLink} style={link}>
            {assessmentLink}
          </Link>
          
          <Section style={tipsSection}>
            <Text style={tipsHeading}>Tips for Success:</Text>
            <Text style={tipText}>• Find a quiet place with good internet connection</Text>
            <Text style={tipText}>• Allow 30-45 minutes to complete the assessment</Text>
            <Text style={tipText}>• Answer thoughtfully and honestly</Text>
            <Text style={tipText}>• You can only submit the assessment once</Text>
          </Section>
          
          <Text style={footerText}>
            If you have any questions or need assistance, please don't hesitate to reach out.
          </Text>
          
          <Text style={footerText}>
            Best regards,<br />
            {companyName} Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AssessmentInviteEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 24px',
  backgroundColor: '#0F172A',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0',
  textAlign: 'center' as const,
}

const content = {
  padding: '0 48px',
}

const greeting = {
  fontSize: '18px',
  lineHeight: '28px',
  fontWeight: '600',
  color: '#0F172A',
  marginBottom: '16px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#334155',
  marginBottom: '16px',
}

const dueDateBox = {
  backgroundColor: '#FEF3C7',
  border: '2px solid #F59E0B',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const dueDateText = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#92400E',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0F172A',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const link = {
  color: '#3B82F6',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const tipsSection = {
  backgroundColor: '#F8FAFC',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
}

const tipsHeading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0F172A',
  margin: '0 0 12px 0',
}

const tipText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#475569',
  margin: '4px 0',
}

const footerText = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#64748B',
  marginTop: '32px',
}
