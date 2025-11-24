import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export const Header = () => {
  const [balance, setBalance] = useState(5.00);

  const getBalanceColor = () => {
    if (balance >= 5) return "bg-green-100 text-green-800";
    if (balance < 1) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

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
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Home
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Pricing
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Support
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Settings
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-opacity hover:opacity-80 ${getBalanceColor()}`}
            onClick={() => console.log('Navigate to Settings')}
          >
            ${balance.toFixed(2)}
          </button>
          <button 
            className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold transition-opacity hover:opacity-80"
            onClick={() => console.log('Navigate to Settings')}
          >
            M
          </button>
        </nav>
      </div>
    </header>
  );
};
