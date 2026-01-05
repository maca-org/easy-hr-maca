import { Linkedin } from "lucide-react";

const teamMembers = [
  {
    name: "Alex Morrison",
    role: "Founder & CEO",
    avatar: "AM",
    linkedin: "#",
  },
  {
    name: "Jordan Lee",
    role: "CTO",
    avatar: "JL",
    linkedin: "#",
  },
  {
    name: "Taylor Smith",
    role: "Head of Product",
    avatar: "TS",
    linkedin: "#",
  },
  {
    name: "Casey Rivera",
    role: "Lead Designer",
    avatar: "CR",
    linkedin: "#",
  },
];

export const TeamSection = () => {
  return (
    <div className="mt-16">
      <div className="text-center mb-10">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Meet our team
        </h3>
        <p className="text-muted-foreground">
          The people behind Candidate Assess
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
        {teamMembers.map((member) => (
          <div 
            key={member.name}
            className="group text-center space-y-4"
          >
            <div className="relative mx-auto w-24 h-24 md:w-28 md:h-28">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-pink opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-pink bg-clip-text text-transparent">
                  {member.avatar}
                </span>
              </div>
              
              {/* LinkedIn hover */}
              <a 
                href={member.linkedin}
                className="absolute inset-0 rounded-full bg-[#0077B5] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="w-8 h-8 text-white" />
              </a>
            </div>
            
            <div>
              <p className="font-semibold text-foreground">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSection;
