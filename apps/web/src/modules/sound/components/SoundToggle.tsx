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
  return (
    <Button
      variant="ghost"
      size="sm"
      className="sound-toggle"
      aria-pressed={on}
      title={on ? 'Desligar sons' : 'Ligar sons'}
      onClick={() => setSound(!on)}
    >
      {on ? '🔊' : '🔇'}
    </Button>
  );
}
