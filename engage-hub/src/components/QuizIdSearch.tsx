import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const QuizIdSearch = () => {
    const [quizId, setQuizId] = useState("");
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!quizId.trim()) return;

        setSearching(true);
        try {
            await api.getQuizDetail(quizId.trim());
            // If checking details works (API returns 200), we proceed
            navigate(`/quiz/${quizId.trim()}`);
        } catch (error) {
            toast({
                title: "Invalid Quiz ID",
                description: "This quiz could not be found. Please check the ID and try again.",
                variant: "destructive"
            });
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <Input
                    type="text"
                    placeholder="Enter Quiz ID to join..."
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9 h-10"
                />
            </div>
            <Button
                onClick={handleSearch}
                disabled={searching || !quizId.trim()}
                className="h-10 px-4"
                size="sm"
            >
                {searching ? "..." : "Go"}
            </Button>
        </div>
    );
};
