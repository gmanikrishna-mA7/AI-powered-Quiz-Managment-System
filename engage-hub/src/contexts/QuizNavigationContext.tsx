import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface QuizNavigationContextType {
    isQuizActive: boolean;
    setQuizActive: (active: boolean) => void;
    quizSubmitHandler: (() => Promise<void>) | null;
    setQuizSubmitHandler: (handler: (() => Promise<void>) | null) => void;
    pendingNavigation: (() => void) | null;
    setPendingNavigation: (navigation: (() => void) | null) => void;
}

const QuizNavigationContext = createContext<QuizNavigationContextType | undefined>(undefined);

export const QuizNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isQuizActive, setIsQuizActive] = useState(false);
    const quizSubmitHandlerRef = useRef<(() => Promise<void>) | null>(null);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    const setQuizActive = useCallback((active: boolean) => {
        setIsQuizActive(active);
        if (!active) {
            // Clear handlers when quiz is no longer active
            quizSubmitHandlerRef.current = null;
            setPendingNavigation(null);
        }
    }, []);

    const setQuizSubmitHandler = useCallback((handler: (() => Promise<void>) | null) => {
        quizSubmitHandlerRef.current = handler;
    }, []);

    return (
        <QuizNavigationContext.Provider
            value={{
                isQuizActive,
                setQuizActive,
                quizSubmitHandler: quizSubmitHandlerRef.current,
                setQuizSubmitHandler,
                pendingNavigation,
                setPendingNavigation,
            }}
        >
            {children}
        </QuizNavigationContext.Provider>
    );
};

export const useQuizNavigation = () => {
    const context = useContext(QuizNavigationContext);
    if (context === undefined) {
        throw new Error('useQuizNavigation must be used within a QuizNavigationProvider');
    }
    return context;
};
