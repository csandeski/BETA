import { useCallback, useState } from 'react';

// Criar sons mais suaves e agradáveis usando Web Audio API
class SoundGenerator {
  private audioContext: AudioContext | null = null;

  private getContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playClick() {
    try {
      const context = this.getContext();
      const now = context.currentTime;

      // Criar um som de clique suave com múltiplas frequências harmônicas
      const oscillator1 = context.createOscillator();
      const oscillator2 = context.createOscillator();
      const gainNode = context.createGain();

      // Frequências harmônicas agradáveis
      oscillator1.frequency.value = 800; // Nota principal
      oscillator2.frequency.value = 1200; // Harmônica

      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // Envelope suave (fade in e fade out)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Fade in rápido
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); // Fade out suave

      // Conectar os nós
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(context.destination);

      // Tocar o som
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.1);
      oscillator2.stop(now + 0.1);
    } catch (error) {
      // Fallback silencioso
    }
  }

  playReward() {
    try {
      const context = this.getContext();
      const now = context.currentTime;

      // Criar uma sequência melódica agradável (arpejo maior)
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (arpejo de Dó maior)
      
      notes.forEach((freq, index) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const startTime = now + index * 0.12; // Delay entre notas
        const duration = 0.3;

        // Envelope com ataque e release suaves
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });

      // Adicionar um som de "shimmer" de fundo
      const shimmer = context.createOscillator();
      const shimmerGain = context.createGain();
      
      shimmer.frequency.value = 2093; // C7 - nota bem aguda para brilho
      shimmer.type = 'sine';
      
      shimmerGain.gain.setValueAtTime(0, now);
      shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      shimmer.connect(shimmerGain);
      shimmerGain.connect(context.destination);
      
      shimmer.start(now);
      shimmer.stop(now + 0.8);
    } catch (error) {
      // Fallback silencioso
    }
  }

  playSuccess() {
    try {
      const context = this.getContext();
      const now = context.currentTime;

      // Criar um acorde maior agradável
      const frequencies = [261.63, 329.63, 392.00]; // C, E, G (tríade maior)
      
      frequencies.forEach(freq => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        // Envelope suave
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
      });
    } catch (error) {
      // Fallback silencioso
    }
  }

  playHover() {
    try {
      const context = this.getContext();
      const now = context.currentTime;

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.frequency.value = 600; // Nota suave
      oscillator.type = 'sine';

      // Som muito sutil
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.05);
    } catch (error) {
      // Fallback silencioso
    }
  }

  playAmbient() {
    try {
      const context = this.getContext();
      const now = context.currentTime;
      
      // Som ambiente suave para leitura - múltiplas camadas
      const frequencies = [
        130.81, // C3 - baixo
        261.63, // C4 - médio
        523.25, // C5 - agudo
      ];
      
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];
      
      frequencies.forEach((freq, index) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const lfo = context.createOscillator(); // Para criar variação sutil
        const lfoGain = context.createGain();
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // LFO para criar movimento sutil
        lfo.frequency.value = 0.1 + index * 0.05; // Velocidades diferentes para cada camada
        lfo.type = 'sine';
        lfoGain.gain.value = 2; // Pequena variação de frequência
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        // Volume muito baixo para ser relaxante
        const volume = index === 0 ? 0.03 : 0.02; // Baixo mais presente
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 2); // Fade in lento
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.start(now);
        lfo.start(now);
        
        oscillators.push(oscillator);
        gains.push(gainNode);
      });
      
      // Retornar função para parar o som
      return () => {
        const fadeOutTime = context.currentTime + 1;
        gains.forEach(gain => {
          gain.gain.exponentialRampToValueAtTime(0.001, fadeOutTime);
        });
        setTimeout(() => {
          oscillators.forEach(osc => {
            try { osc.stop(); } catch {}
          });
        }, 1100);
      };
    } catch (error) {
      return () => {}; // Retorna função vazia se falhar
    }
  }
}

// Instância singleton do gerador de sons
const soundGenerator = new SoundGenerator();

export function useSound() {
  const [ambientStop, setAmbientStop] = useState<(() => void) | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const playSound = useCallback((soundType: 'click' | 'reward' | 'success' | 'hover') => {
    try {
      switch(soundType) {
        case 'click':
          soundGenerator.playClick();
          break;
        case 'reward':
          soundGenerator.playReward();
          break;
        case 'success':
          soundGenerator.playSuccess();
          break;
        case 'hover':
          soundGenerator.playHover();
          break;
      }
    } catch (error) {
      // Silenciosamente falha se o áudio não for suportado
    }
  }, []);
  
  const startAmbientSound = useCallback(() => {
    // Para o som anterior se existir
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }
    
    // Criar e tocar o arquivo MP3 (importar como módulo)
    const audio = new Audio(new URL('../assets/reading-music.mp3', import.meta.url).href);
    audio.loop = true;
    audio.volume = 0.65; // Volume um pouco mais alto para leitura (65%)
    
    // Garantir que o volume seja aplicado antes de tocar
    audio.addEventListener('loadedmetadata', () => {
      audio.volume = 0.65;
    });
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("Autoplay foi bloqueado:", error);
      });
    }
    
    setAudioElement(audio);
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioElement]);
  
  const stopAmbientSound = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }
  }, [audioElement]);

  return { playSound, startAmbientSound, stopAmbientSound };
}