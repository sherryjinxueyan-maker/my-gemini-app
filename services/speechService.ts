
export interface SpeechResult {
  transcript: string;
  isFinal: boolean;
}

export class SpeechService {
  private recognition: any;
  private onResultCallback: (result: SpeechResult) => void = () => {};
  private onEndCallback: () => void = () => {};
  private onErrorCallback: (error: string) => void = () => {};

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        this.onResultCallback({
          transcript: finalTranscript || interimTranscript,
          isFinal: !!finalTranscript
        });
      };

      this.recognition.onerror = (event: any) => {
        this.onErrorCallback(event.error);
      };

      this.recognition.onend = () => {
        this.onEndCallback();
      };
    }
  }

  public start(callbacks: {
    onResult: (result: SpeechResult) => void;
    onEnd: () => void;
    onError: (error: string) => void;
  }) {
    if (!this.recognition) {
      callbacks.onError('Browser does not support speech recognition.');
      return;
    }
    this.onResultCallback = callbacks.onResult;
    this.onEndCallback = callbacks.onEnd;
    this.onErrorCallback = callbacks.onError;
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Speech recognition already started or failed:', e);
    }
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

export const speechService = new SpeechService();
