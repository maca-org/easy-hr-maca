export interface Question {
  id: string;
  type: "mcq" | "open";
  question: string;
  options?: string[];
}

export const generateQuestions = (jobDescription: string): Question[] => {
  const questions: Question[] = [];
  
  // Extract key terms from job description
  const keywords = extractKeywords(jobDescription);
  
  // Generate 6 MCQ questions
  const mcqTemplates = [
    {
      question: `What is the most important skill for this ${keywords.role || 'position'}?`,
      options: [
        keywords.skill1 || "Technical expertise",
        keywords.skill2 || "Communication skills",
        keywords.skill3 || "Problem-solving ability",
        keywords.skill4 || "Team collaboration"
      ]
    },
    {
      question: `How many years of experience are required for this role?`,
      options: ["0-2 years", "2-5 years", "5-8 years", "8+ years"]
    },
    {
      question: `Which of the following best describes the work environment?`,
      options: ["Remote", "Hybrid", "On-site", "Flexible"]
    },
    {
      question: `What type of projects will you primarily work on?`,
      options: [
        keywords.project1 || "New product development",
        keywords.project2 || "Maintenance and support",
        keywords.project3 || "Research and innovation",
        keywords.project4 || "Client-facing projects"
      ]
    },
    {
      question: `Which technology stack is most relevant to this position?`,
      options: [
        keywords.tech1 || "Frontend technologies",
        keywords.tech2 || "Backend systems",
        keywords.tech3 || "Full-stack development",
        keywords.tech4 || "Cloud infrastructure"
      ]
    },
    {
      question: `What is the expected team size you'll be working with?`,
      options: ["1-5 people", "5-10 people", "10-20 people", "20+ people"]
    }
  ];

  mcqTemplates.forEach((template, index) => {
    questions.push({
      id: `mcq-${Date.now()}-${index}`,
      type: "mcq",
      question: template.question,
      options: template.options
    });
  });

  // Generate 4 Open-ended questions
  const openTemplates = [
    `Describe your experience with ${keywords.skill1 || 'the key skills'} mentioned in the job description.`,
    `Can you provide an example of a challenging project you've worked on that relates to this ${keywords.role || 'position'}?`,
    `What motivates you to apply for this role, and how do you see yourself contributing to the team?`,
    `Where do you see yourself professionally in the next 2-3 years, and how does this role fit into your career goals?`
  ];

  openTemplates.forEach((template, index) => {
    questions.push({
      id: `open-${Date.now()}-${index}`,
      type: "open",
      question: template
    });
  });

  return questions;
};

const extractKeywords = (description: string): Record<string, string> => {
  const lower = description.toLowerCase();
  const keywords: Record<string, string> = {};

  // Extract role
  const roleKeywords = ['developer', 'engineer', 'designer', 'manager', 'analyst', 'specialist', 'consultant'];
  for (const role of roleKeywords) {
    if (lower.includes(role)) {
      keywords.role = role;
      break;
    }
  }

  // Extract skills
  const skillKeywords = ['react', 'javascript', 'python', 'java', 'design', 'analysis', 'communication', 'leadership'];
  let skillCount = 1;
  for (const skill of skillKeywords) {
    if (lower.includes(skill) && skillCount <= 4) {
      keywords[`skill${skillCount}`] = skill;
      skillCount++;
    }
  }

  // Extract tech stack
  const techKeywords = ['frontend', 'backend', 'fullstack', 'cloud', 'mobile', 'web', 'api', 'database'];
  let techCount = 1;
  for (const tech of techKeywords) {
    if (lower.includes(tech) && techCount <= 4) {
      keywords[`tech${techCount}`] = tech;
      techCount++;
    }
  }

  // Extract project types
  const projectKeywords = ['development', 'maintenance', 'research', 'client', 'innovation', 'support'];
  let projectCount = 1;
  for (const project of projectKeywords) {
    if (lower.includes(project) && projectCount <= 4) {
      keywords[`project${projectCount}`] = project;
      projectCount++;
    }
  }

  return keywords;
};
