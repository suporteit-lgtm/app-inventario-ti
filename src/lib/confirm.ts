// Confirmação com popup do PRÓPRIO app (renderizado pelo ConfirmHost em App.tsx)

export interface ConfirmRequest {
  titulo: string;
  mensagem: string;
  confirmarLabel: string;
  resolve: (ok: boolean) => void;
}

let host: ((req: ConfirmRequest) => void) | null = null;

export function registerConfirmHost(fn: ((req: ConfirmRequest) => void) | null) {
  host = fn;
}

export function confirmAsync(titulo: string, mensagem: string, confirmarLabel = 'Excluir'): Promise<boolean> {
  return new Promise((resolve) => {
    if (host) host({ titulo, mensagem, confirmarLabel, resolve });
    else resolve(false);
  });
}
