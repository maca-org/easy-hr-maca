import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";

export const Header = () => {
  return (
    <header className="border-b border-border bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            <span className="text-primary">AI</span> Resume Screening
          </h1>
        </div>
        
        <nav className="flex items-center gap-6">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            Pricing
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary">
            Support
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary">
            Settings
          </Button>
          <div className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium">
            $4.65
          </div>
          <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
            M
          </div>
        </nav>
      </div>
    </header>
  );
};
