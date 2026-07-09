/**
 * Calculate user level based on XP with progressive difficulty.
 * Each level requires more XP than the previous, with increasing increments.
 * 
 * Level progression:
 * Level 1: 50 XP
 * Level 2: 110 XP (50 + 60)
 * Level 3: 180 XP (110 + 70)
 * Level 4: 260 XP (180 + 80)
 * And so on...
 */

export function calculateLevel(xp: number): {
    level: number;
    currentLevelXP: number;
    nextLevelXP: number;
    xpInCurrentLevel: number;
    progressPercentage: number;
} {
    let level = 1;
    let totalXPRequired = 0;
    let baseIncrement = 50;
    let currentIncrement = baseIncrement;

    // Calculate level by accumulating XP requirements
    while (xp >= totalXPRequired + currentIncrement) {
        totalXPRequired += currentIncrement;
        level++;
        currentIncrement = baseIncrement + (level - 1) * 10; // Increment increases by 10 each level
    }

    // XP required for current level
    const currentLevelXP = totalXPRequired;

    // XP required for next level
    const nextLevelXP = totalXPRequired + currentIncrement;

    // XP gained in current level
    const xpInCurrentLevel = xp - currentLevelXP;

    // Progress percentage towards next level
    const progressPercentage = (xpInCurrentLevel / currentIncrement) * 100;

    return {
        level,
        currentLevelXP,
        nextLevelXP,
        xpInCurrentLevel,
        progressPercentage
    };
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(targetLevel: number): number {
    let totalXP = 0;
    let baseIncrement = 50;

    for (let level = 1; level < targetLevel; level++) {
        const currentIncrement = baseIncrement + (level - 1) * 10;
        totalXP += currentIncrement;
    }

    return totalXP;
}
