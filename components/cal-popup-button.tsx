'use client';

import React, { useEffect } from 'react';

interface CalPopupButtonProps {
  calUrl: string;
  calPath?: string;
  label?: string;
  className?: string;
}

declare global {
  interface Window {
    Cal?: any;
  }
}

export function CalPopupButton({
  calUrl,
  calPath,
  label = "Agendar Cita (Pop-up Modal)",
  className,
}: CalPopupButtonProps) {
  useEffect(() => {
    (function (C: any, A: string, L: string) {
      let p = function (a: any, ar: any) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal; let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api: any = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    try {
      if (window.Cal) {
        window.Cal("init", { origin: "https://cal.com" });
        window.Cal("ui", {
          styles: { branding: { brandColor: "#063231" } },
          hideEventTypeDetails: false,
          layout: "month_view",
        });
      }
    } catch (e) {
      console.warn("Cal init error:", e);
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    let target = calPath || calUrl;
    if (target.indexOf('cal.com/') !== -1) {
      target = target.substring(target.indexOf('cal.com/') + 8);
    }
    target = target.replace(/^\/+/, '');

    if (window.Cal) {
      window.Cal("modal", {
        calLink: target,
        config: { layout: "month_view" },
      });
    } else {
      window.open(calUrl, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className || "w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#CBFF54] text-[#063231] font-black text-base shadow-lg shadow-[#CBFF54]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center cursor-pointer"}
    >
      <span>📅</span>
      <span>{label}</span>
    </button>
  );
}
