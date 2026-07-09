import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="bg-background/60 border-border/50 bg-card/50 backdrop-blur-sm card-shadow hover:card-shadow-hover transform hover:scale-105 transition-all duration-300">
      <CardContent className="p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};
