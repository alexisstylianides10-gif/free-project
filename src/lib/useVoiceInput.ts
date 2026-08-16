"use client";

import { useEffect, useRef, useState } from "react";

// Web Speech API isn't in lib.dom.d.ts's TS types yet; declare the bits we use.
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { [i: number]: { [j: number]: SpeechRecognitionResultLike; isFinal: boolean }; length: number };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
    // continuous=true is the fix for "cuts off after a few words": in
    // non-continuous mode the browser stops listening the moment it detects
    // the first pause in speech, so anything said after a brief breath was
    // silently dropped. Continuous mode keeps the mic open across pauses
    // until the user taps to stop, and onresult fires once per finalized
    // segment (via resultIndex) rather than once total — so segments are
    // appended as the user keeps talking instead of only capturing the first.
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result.isFinal) continue;
        const text = result[0]?.transcript?.trim();
        if (text) onTranscript(text);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
    }
  }

  return { supported, listening, toggle };
}
