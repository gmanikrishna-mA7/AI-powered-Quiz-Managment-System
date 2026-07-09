
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, HelpCircle, Shuffle, ArrowRight, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ArcadeFunWidget() {
    const navigate = useNavigate();

    const games = [
        {
            title: "Host Live Quiz",
            icon: Radio,
            description: "Interact with audience",
            color: "text-red-500",
            bg: "bg-red-500/10",
            hash: "live_host"
        },
        {
            title: "Two Truths One Lie",
            icon: HelpCircle,
            description: "Test your deception",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            hash: "two_truths"
        },
        {
            title: "Scramble Word",
            icon: Shuffle,
            description: "Unscramble & win",
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            hash: "scramble"
        }
    ];

    return (
        <Card className="bg-background border-border/60 hover:border-primary/30 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Gamepad2 className="w-24 h-24" />
            </div>

            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-xl">
                    <span className="flex items-center gap-2">
                        <Gamepad2 className="w-6 h-6 text-[#3B82F6]" /> Arcade Fun
                    </span>
                    <Button
                        variant="link"
                        className="text-xs text-muted-foreground hover:text-primary p-0 h-auto font-normal"
                        onClick={() => navigate("/fun-activities")}
                    >
                        View All
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {games.map((game, idx) => (
                        <div
                            key={idx}
                            onClick={() => navigate(`/fun-activities#${game.hash}`)}
                            className="bg-card/80 flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-muted/70 hover:to-muted/40 transition-all duration-300 cursor-pointer group border border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
                        >
                            <div className={`p-2.5 rounded-lg ${game.bg} ${game.color} group-hover:scale-110 transition-transform shadow-sm`}>
                                <game.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{game.title}</h3>
                                <p className="text-xs text-muted-foreground">{game.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
