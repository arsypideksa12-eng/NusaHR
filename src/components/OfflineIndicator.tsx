import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Mode Offline — Menampilkan data tersimpan sementara. Koneksi internet diperlukan untuk sinkronisasi real-time.</span>
    </div>
  );
};
