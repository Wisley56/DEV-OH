import { Volume2, VolumeX } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '../../../shared/ui';
import { useProfile } from '../../profile';
import { sfx } from '../services/sfx';

/** Liga/desliga os sons (fica salvo no perfil). Também carrega os sons quando aparece. */
export function SoundToggle() {
  const on = useProfile((s) => s.sound);
  const setSound = useProfile((s) => s.setSound);
  useEffect(() => {
    sfx.enabled = on;
    void sfx.preload();
  }, [on]);
  const Icon = on ? Volume2 : VolumeX;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="sound-toggle"
      aria-pressed={on}
      aria-label={on ? 'Desligar sons' : 'Ligar sons'}
      title={on ? 'Desligar sons' : 'Ligar sons'}
      onClick={() => setSound(!on)}
    >
      <Icon size={18} aria-hidden />
    </Button>
  );
}
