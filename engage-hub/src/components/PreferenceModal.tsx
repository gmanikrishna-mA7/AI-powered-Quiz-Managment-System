import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TOPICS } from "@/lib/topics";
import { Sparkles } from "lucide-react";

interface PreferenceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: () => void;
}

export const PreferenceModal = ({ open, onOpenChange, onSave }: PreferenceModalProps) => {
    const { user, checkAuth } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Initialize state with current user preferences or empty
    const [selectedInterests, setSelectedInterests] = useState<string[]>(
        user?.preferences?.interests || []
    );

    const handleAddPreference = (preference: string) => {
        if (!selectedInterests.includes(preference)) {
            setSelectedInterests([...selectedInterests, preference]);
        }
    };

    const handleRemovePreference = (preference: string) => {
        setSelectedInterests(selectedInterests.filter(p => p !== preference));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateProfile({
                full_name: user?.full_name || '',
                preferences: { interests: selectedInterests }
            });

            toast({
                title: "Preferences Saved! 🎨",
                description: "Your feed has been personalized.",
            });

            await checkAuth(); // Refresh user context
            if (onSave) onSave();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Failed to save",
                description: "Please try again.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            // Prevent closing if it's the initial welcome process (optional, but keep flexible)
            if (!saving) onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        Welcome, {user?.full_name?.split(' ')[0] || 'Explorer'}!
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Tell us what you love to learn about! We'll personalize your daily quizzes based on your interests.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Select Interests
                        </Label>

                        <select
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleAddPreference(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            disabled={saving}
                        >
                            <option value="">Choose a topic...</option>
                            {TOPICS
                                .filter(pref => !selectedInterests.includes(pref))
                                .map((pref) => (
                                    <option key={pref} value={pref}>{pref}</option>
                                ))}
                        </select>

                        {/* Selected Pills */}
                        <div className="min-h-[100px] p-4 rounded-xl bg-muted/30 border border-border/50">
                            {selectedInterests.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedInterests.map((interest) => (
                                        <span
                                            key={interest}
                                            className="px-3 py-1.5 rounded-full bg-background border border-primary/20 text-foreground font-medium text-sm flex items-center gap-2 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                                        >
                                            {interest}
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePreference(interest)}
                                                className="hover:text-destructive transition-colors ml-1"
                                                disabled={saving}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                                    No interests selected yet...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || selectedInterests.length === 0}
                        className="gradient-primary text-white min-w-[120px]"
                    >
                        {saving ? "Customizing..." : "Start Exploring 🚀"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
