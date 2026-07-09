import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  quizCount: number;
  link: string;
}

export const CategoryCard = ({ title, description, icon, gradient, quizCount, link }: CategoryCardProps) => {
  return (
    <Link to={link} className="block group ">
      <Card className={`bg-background/60 overflow-hidden border-0 card-shadow hover:card-shadow-hover transform hover:scale-105 transition-all duration-300 cursor-pointer ${gradient}`}>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <img src={icon} alt={title} className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              {title}
            </h3>

            {/* Description */}
            <p className="text-white/80 text-sm md:text-base">
              {description}
            </p>

            {/* Quiz Count Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold">
              {quizCount}+ Quizzes Available
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
