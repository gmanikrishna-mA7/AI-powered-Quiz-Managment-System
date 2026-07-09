import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Star } from "lucide-react";
import { api } from "@/lib/api";
import { calculateLevel } from "@/lib/levelUtils";
import { ACHIEVEMENTS, Achievement } from "@/lib/achievements";

interface AchievementsProps {
    className?: string;
}

export const Achievements = ({ className = "" }: AchievementsProps) => {
    const [xp, setXP] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Fetch user XP
    useEffect(() => {
        const fetchXP = async () => {
            try {
                const { default: cacheService } = await import('@/lib/cacheService');
                const cachedXP: any = cacheService.get('user_xp');

                if (cachedXP) {
                    setXP(cachedXP.data?.xp_score || 0);
                    setLoading(false);
                }

                const xpRes = await api.getUserXP();
                const xpData: any = xpRes;
                setXP(xpData.data?.xp_score || 0);
                cacheService.set('user_xp', xpRes);
            } catch (error) {
                console.error('Failed to fetch XP:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchXP();
    }, []);

    // Calculate current level from XP
    const levelInfo = calculateLevel(xp);
    const currentLevel = levelInfo.level;

    // Check if achievement is unlocked
    const isAchievementUnlocked = (achievement: Achievement): boolean => {
        if (achievement.condition.type === "level_reached") {
            return currentLevel >= achievement.condition.value;
        }
        return false;
    };

    // Count unlocked achievements
    const unlockedCount = ACHIEVEMENTS.filter(isAchievementUnlocked).length;

    return (
        <Card className={`border-border/50 card-shadow bg-background/60 ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-warning" />
                    Achievements ({unlockedCount}/{ACHIEVEMENTS.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading achievements...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ACHIEVEMENTS.map((achievement) => {
                            const unlocked = isAchievementUnlocked(achievement);

                            return (
                                <div
                                    key={achievement.id}
                                    className={`p-4 rounded-lg border ${unlocked
                                            ? "border-warning/30 bg-warning/5"
                                            : "border-border/50 bg-muted/20 opacity-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${unlocked ? "bg-warning/20" : "bg-muted"
                                                }`}
                                        >
                                            {achievement.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground">{achievement.name}</p>
                                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                            {unlocked && (
                                                <p className="text-xs text-warning mt-1">+{achievement.xp_reward} XP Reward</p>
                                            )}
                                        </div>
                                        {unlocked && <Star className="w-5 h-5 text-warning ml-auto flex-shrink-0" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
