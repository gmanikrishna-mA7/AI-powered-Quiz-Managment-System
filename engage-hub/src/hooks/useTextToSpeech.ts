
import { useState, useCallback, useEffect, useRef } from 'react';

// Common Language Code Mapping (Custom Name -> BCP 47)
const LANGUAGE_MAP: Record<string, string> = {
    'english': 'en-US',
    'hindi': 'hi-IN',
    'spanish': 'es-ES',
    'french': 'fr-FR',
    'german': 'de-DE',
    'italian': 'it-IT',
    'portuguese': 'pt-PT',
    'russian': 'ru-RU',
    'japanese': 'ja-JP',
    'chinese': 'zh-CN',
    // Add more as needed
};

interface UseTextToSpeechReturn {
    speak: (text: string, language?: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export const useTextToSpeech = (): UseTextToSpeechReturn => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthesisRef.current = window.speechSynthesis;
            setIsSupported(true);
        }
    }, []);

    const getVoice = useCallback((langCode: string): SpeechSynthesisVoice | undefined => {
        if (!synthesisRef.current) return undefined;

        const voices = synthesisRef.current.getVoices();

        // 1. Try exact match
        let voice = voices.find(v => v.lang === langCode);

        // 2. Try partial match (e.g. 'en-US' matches 'en', or 'hi' matches 'hi-IN')
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]) || langCode.startsWith(v.lang));
        }

        // 3. Fallback to Google voices (often better quality/multilingual)
        if (!voice && langCode.startsWith('hi')) {
            voice = voices.find(v => v.name.includes('Google') && v.name.includes('Hindi'));
        }

        // 4. Fallback to default
        if (!voice) {
            voice = voices.find(v => v.default);
        }

        return voice;
    }, []);

    const cancel = useCallback(() => {
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    const speak = useCallback((text: string, language: string = 'English') => {
        if (!synthesisRef.current) return;

        // Cancel any current speech first
        synthesisRef.current.cancel();

        const langCode = LANGUAGE_MAP[language.toLowerCase()] || 'en-US';
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = langCode;

        // Find appropriate voice
        const voice = getVoice(langCode);
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
            console.error("Speech synthesis error", event);
            setIsSpeaking(false);
        };

        synthesisRef.current.speak(utterance);
    }, [getVoice]);

    // Ensure voices are loaded (Chrome sometimes needs this)
    useEffect(() => {
        if (synthesisRef.current) {
            synthesisRef.current.onvoiceschanged = () => {
                // Forces voice list update
                synthesisRef.current?.getVoices();
            };
        }
    }, []);

    return { speak, cancel, isSpeaking, isSupported };
};
