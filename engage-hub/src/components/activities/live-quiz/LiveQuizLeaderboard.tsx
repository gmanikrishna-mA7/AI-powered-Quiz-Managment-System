import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function LiveQuizLeaderboard({ players, currentUsername }: { players?: any[], currentUsername?: string }) {
    // If no players passed, use fallback or empty
    const leaders = (players || []).length > 0
        ? [...players!].sort((a, b) => b.score - a.score).slice(0, 10)
        : [];

    if (leaders.length === 0) {
        return <div className="text-muted-foreground">No scores to display.</div>
    }

    // Calculate ranks (Standard Competition Ranking 1, 1, 3, 4)
    let currentRank = 1;
    const rankedLeaders = leaders.map((p, i) => {
        if (i > 0 && p.score < leaders[i - 1].score) {
            currentRank = i + 1;
        }
        return { ...p, rank: currentRank };
    });

    return (
        <div className="w-full bg-card overflow-hidden">
            {/* <div className="p-4 bg-primary text-primary-foreground font-bold text-center">CURRENT STANDINGS</div> */}
            {/* Header removed as parent handles it */}
            <div className="divide-y max-h-[400px] overflow-y-auto">
                {rankedLeaders.map((p, i) => {
                    const isMe = p.is_me || (currentUsername && (p.username === currentUsername || p.guest_name === currentUsername));
                    return (
                        <div key={i} className={`flex items-center justify-between p-4 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                            <div className="flex items-center gap-4">
                                <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0
                            ${p.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                                        p.rank === 2 ? "bg-gray-300 text-gray-900" :
                                            p.rank === 3 ? "bg-orange-300 text-orange-900" : "bg-muted text-muted-foreground"}
                        `}>
                                    {p.rank}
                                </div>
                                <Avatar className="w-10 h-10 border-2 border-background shrink-0">
                                    <AvatarFallback>{p.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-lg break-words">
                                    {p.name || "Unknown"}
                                    {isMe && <span className="text-primary font-bold ml-1 text-sm">(You)</span>}
                                </span>
                            </div>
                            <div className="font-mono font-bold text-xl">{p.score}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
