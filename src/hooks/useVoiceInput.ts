import { useState, useEffect, useRef, useCallback } from 'react';

// Declaration for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ExtendedWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface ParsedVoiceCommand {
  rawText: string;
  matchedDishName?: string;
  matchedItemId?: string;
  quantity?: number;
  targetStream?: 'sales' | 'chef' | 'management' | 'ending' | 'beginning';
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const extWin = window as unknown as ExtendedWindow;
      const SpeechRecognitionConstructor =
        extWin.SpeechRecognition || extWin.webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        setIsSupported(true);
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = true;
        // am-ET for Amharic or en-US
        recognition.lang = 'am-ET';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('የማይክሮፎን ፈቃድ አልተሰጠም (Microphone permission denied)');
          } else if (event.error !== 'no-speech') {
            setErrorMessage(`የድምጽ ስህተት፡ ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback((lang: 'am-ET' | 'en-US' = 'am-ET') => {
    if (!recognitionRef.current) {
      setErrorMessage('በዚህ ብራውዘር ላይ የድምጽ ቴክኖሎጂ አይደገፍም (Speech API not supported)');
      return;
    }
    try {
      setTranscript('');
      setErrorMessage(null);
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  /**
   * Smart Parser: Extracts numbers and targets from voice transcript
   */
  const parseVoiceCommand = useCallback((text: string): ParsedVoiceCommand => {
    const rawText = text.trim();
    const result: ParsedVoiceCommand = { rawText };

    // Extract numbers (both latin 0-9 and ge'ez if any)
    const numberMatch = rawText.match(/\d+(\.\d+)?/);
    if (numberMatch) {
      result.quantity = parseFloat(numberMatch[0]);
    }

    // Determine target stream from keywords
    const lower = rawText.toLowerCase();
    if (lower.includes('ሼፍ') || lower.includes('ኩሽና') || lower.includes('chef') || lower.includes('kitchen') || lower.includes('kot')) {
      result.targetStream = 'chef';
    } else if (lower.includes('ማኔጅመንት') || lower.includes('እንግዳ') || lower.includes('management') || lower.includes('vip')) {
      result.targetStream = 'management';
    } else if (lower.includes('ኢንዲንግ') || lower.includes('ማታ') || lower.includes('ending') || lower.includes('ቆጠራ')) {
      result.targetStream = 'ending';
    } else if (lower.includes('ቢግኒንግ') || lower.includes('ጠዋት') || lower.includes('beginning')) {
      result.targetStream = 'beginning';
    } else {
      result.targetStream = 'sales'; // default to cash sales
    }

    return result;
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    parseVoiceCommand,
  };
}
