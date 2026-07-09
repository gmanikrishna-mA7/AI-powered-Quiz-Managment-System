import React from 'react';

export const BackgroundGradient = () => {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden">
            {/* Nebula/Aurora Animation Keyframes */}
            <style>{`
                @keyframes nebula-drift-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    33% { transform: translate(15vw, -10vh) scale(1.2); opacity: 0.8; }
                    66% { transform: translate(-10vw, 15vh) scale(0.9); opacity: 0.5; }
                }
                @keyframes nebula-drift-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
                    50% { transform: translate(-20vw, 10vh) scale(1.3); opacity: 0.7; }
                }
                @keyframes nebula-pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }
                
                .animate-nebula-1 { animation: nebula-drift-1 25s infinite ease-in-out; }
                .animate-nebula-2 { animation: nebula-drift-2 30s infinite ease-in-out; }
                .animate-nebula-pulse { animation: nebula-pulse 15s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            `}</style>

            {/* ============================================
                LIGHT MODE: Clean "Daytime" Nebula
                Base: #F8FAFC (Slate 50)
                Top-Left: Pale Lavender (#E0E7FF)
                Bottom-Right: Pale Cyan (#CFFAFE)
                
                DARK MODE: Deep Cosmos Nebula
                Base: #050511 (Deep Black)
                Top-Left: Purple/Violet (#7C3AED)
                Bottom-Right: Cyan/Teal (#0891B2)
            ============================================ */}

            {/* Base Background - Light: #F8FAFC, Dark: #050511 */}
            <div className="absolute inset-0 bg-[#F8FAFC] dark:bg-[#050511]" />

            {/* Mesh Gradient Orbs */}
            <div className="absolute inset-0 overflow-hidden">

                {/* TOP-LEFT: Light=Lavender, Dark=Purple */}
                <div
                    className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vh] rounded-full animate-nebula-1"
                    style={{ filter: 'blur(120px)' }}
                >
                    {/* Light mode gradient */}
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(224,231,255,0.8)_0%,rgba(224,231,255,0.4)_40%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(124,58,237,0.6)_0%,rgba(124,58,237,0.35)_40%,transparent_70%)]" />
                </div>

                {/* TOP-LEFT: Secondary Accent */}
                <div
                    className="absolute top-[10%] left-[20%] w-[50vw] h-[50vh] rounded-full animate-nebula-pulse"
                    style={{ filter: 'blur(120px)' }}
                >
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(224,231,255,0.6)_0%,rgba(224,231,255,0.3)_50%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(124,58,237,0.5)_0%,rgba(124,58,237,0.25)_50%,transparent_70%)]" />
                </div>

                {/* BOTTOM-RIGHT: Light=Cyan, Dark=Teal */}
                <div
                    className="absolute -bottom-[10%] -right-[10%] w-[80vw] h-[80vh] rounded-full animate-nebula-2"
                    style={{ filter: 'blur(120px)' }}
                >
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(207,250,254,0.8)_0%,rgba(207,250,254,0.4)_40%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(8,145,178,0.6)_0%,rgba(8,145,178,0.35)_40%,transparent_70%)]" />
                </div>

                {/* BOTTOM-RIGHT: Secondary Accent */}
                <div
                    className="absolute top-[50%] right-[15%] w-[45vw] h-[45vh] rounded-full animate-nebula-pulse"
                    style={{ filter: 'blur(120px)', animationDelay: '5s' }}
                >
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(207,250,254,0.6)_0%,rgba(207,250,254,0.3)_50%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(8,145,178,0.45)_0%,rgba(8,145,178,0.2)_50%,transparent_70%)]" />
                </div>

                {/* CENTER: Blend bridge */}
                <div
                    className="absolute top-[35%] left-[25%] w-[55vw] h-[40vh] rounded-full"
                    style={{ filter: 'blur(120px)' }}
                >
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse,rgba(224,231,255,0.3)_0%,rgba(207,250,254,0.2)_50%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(124,58,237,0.2)_0%,rgba(8,145,178,0.15)_50%,transparent_70%)]" />
                </div>
            </div>

            {/* Subtle Noise Texture for depth */}
            <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.02] dark:opacity-[0.04]"
                style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
            />
        </div>
    );
};