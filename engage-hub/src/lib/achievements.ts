export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    condition: {
        type: string;
        value: number;
    };
    xp_reward: number;
    is_repeatable: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: "level_2",
        name: "Level Up!",
        description: "Reached Level 2.",
        category: "level",
        icon: "⬆️",
        condition: {
            type: "level_reached",
            value: 2
        },
        xp_reward: 50,
        is_repeatable: false
    },
    {
        id: "level_5",
        name: "Rising Mind",
        description: "Reached Level 5.",
        category: "level",
        icon: "🚀",
        condition: {
            type: "level_reached",
            value: 5
        },
        xp_reward: 150,
        is_repeatable: false
    },
    {
        id: "level_10",
        name: "Knowledge Climber",
        description: "Reached Level 10.",
        category: "level",
        icon: "🧠",
        condition: {
            type: "level_reached",
            value: 10
        },
        xp_reward: 300,
        is_repeatable: false
    },
    {
        id: "level_20",
        name: "Elite Learner",
        description: "Reached Level 20.",
        category: "level",
        icon: "💠",
        condition: {
            type: "level_reached",
            value: 20
        },
        xp_reward: 700,
        is_repeatable: false
    },
    {
        id: "level_30",
        name: "Quiz Veteran",
        description: "Reached Level 30.",
        category: "level",
        icon: "🏆",
        condition: {
            type: "level_reached",
            value: 30
        },
        xp_reward: 1200,
        is_repeatable: false
    },
    {
        id: "level_50",
        name: "Legendary Scholar",
        description: "Reached Level 50.",
        category: "level",
        icon: "👑",
        condition: {
            type: "level_reached",
            value: 50
        },
        xp_reward: 2500,
        is_repeatable: false
    }
];
