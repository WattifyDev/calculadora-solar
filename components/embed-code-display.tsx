"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmbedCodeDisplay() {
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL}/embed.js" defer></script>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/5 rounded-lg -z-10 group-hover:bg-primary/10 transition-colors duration-500" />
        <div className="bg-muted p-6 rounded-lg border border-border shadow-inner overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-destructive opacity-80" />
              <div className="w-3 h-3 rounded-full bg-chart-4 opacity-80" />
              <div className="w-3 h-3 rounded-full bg-primary opacity-80" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                copied && "text-primary"
              )}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <pre className="text-foreground font-mono text-sm overflow-x-auto p-2">
            <code>{embedCode}</code>
          </pre>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-primary/5 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary mb-2">
            Instrucciones de Integración
          </h3>
          <p className="text-sm text-muted-foreground">
            Copia el código anterior y pégalo en la sección <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;body&gt;</code> de tu sitio web donde desees que aparezca la calculadora solar. Si tienes una página en Wordpress, añade el componente &quot;HTML&quot; con el código anterior a la página que desees. Si este componente no está disponible, puedes utilizar el plugin <a href="https://wordpress.org/plugins/insert-headers-and-footers/" target="_blank" rel="noopener noreferrer" className="text-primary underline">WP Code</a> para ello.
          </p>
        </div>
      </div>
    </div>
  );
}
