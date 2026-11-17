import React, { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import { formatTimeHHMM } from '../utils/formatters';

interface PhoneFrameShellProps {
  children: React.ReactNode;
  topBarRight?: React.ReactNode;
  darkStatusBar?: boolean;
}

export const PhoneFrameShell: React.FC<PhoneFrameShellProps> = ({
  children,
  topBarRight,
  darkStatusBar = false,
}) => {
  const [clock, setClock] = useState(() => formatTimeHHMM(new Date().toISOString()));

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatTimeHHMM(new Date().toISOString()));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 md:flex md:flex-col md:items-center md:justify-center md:px-4 md:py-6">
      {/* Desktop-only top utility bar above the phone */}
      {topBarRight && (
        <div className="hidden md:mb-4 md:flex md:w-[416px] md:items-center md:justify-between md:gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/icon.svg"
              alt="NusaHR"
              className="h-7 w-7 rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-sm font-bold text-slate-900">NusaHR Mobile</span>
          </div>
          <div className="flex items-center gap-2">{topBarRight}</div>
        </div>
      )}

      {/* Phone Viewport Container: Edge-to-edge on mobile, realistic smartphone frame on desktop */}
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 md:h-[812px] md:w-[416px] md:rounded-[44px] md:border-[10px] md:border-slate-900 md:shadow-2xl">
        {/* Desktop Phone Status Bar & Dynamic Notch */}
        <div
          className={`hidden md:flex md:h-9 md:shrink-0 md:items-center md:justify-between md:px-6 md:text-[11px] md:font-semibold ${
            darkStatusBar ? 'bg-[#0B1215] text-white' : 'bg-white text-slate-900'
          }`}
        >
          <span className="font-mono-tabular">{clock}</span>
          <div
            className={`h-4 w-24 rounded-full ${
              darkStatusBar ? 'bg-slate-800' : 'bg-slate-900'
            }`}
            aria-hidden="true"
          />
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            <div className="flex h-2.5 w-5 items-center rounded-[3px] border border-current p-[1.5px]">
              <div className="h-full w-3.5 rounded-[1px] bg-current" />
            </div>
          </div>
        </div>

        {/* App Viewport */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

        {/* Desktop Home Indicator Bar */}
        <div
          className={`hidden md:flex md:h-5 md:shrink-0 md:items-center md:justify-center ${
            darkStatusBar ? 'bg-[#0B1215]' : 'bg-white'
          }`}
          aria-hidden="true"
        >
          <div
            className={`h-1 w-28 rounded-full ${
              darkStatusBar ? 'bg-white/25' : 'bg-slate-300'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
