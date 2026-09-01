"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EmbedSection() {
  const [copiedIframe, setCopiedIframe] = useState(false)
  const [copiedJs, setCopiedJs] = useState(false)

  const iframeCode = `<iframe src="https://solar-calculator.vercel.app/embed/iframe" width="100%" height="600" frameborder="0"></iframe>`

  const jsCode = `<div id="solar-calculator"></div>
<script src="https://solar-calculator.vercel.app/embed/script.js" defer></script>
<script>
  initSolarCalculator('solar-calculator');
</script>`

  const copyToClipboard = (text: string, type: "iframe" | "js") => {
    navigator.clipboard.writeText(text)
    if (type === "iframe") {
      setCopiedIframe(true)
      setTimeout(() => setCopiedIframe(false), 2000)
    } else {
      setCopiedJs(true)
      setTimeout(() => setCopiedJs(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <p>
          Integra nuestra calculadora solar en tu sitio web para ofrecer a tus visitantes una herramienta valiosa para
          estimar su potencial solar. Simplemente copia y pega uno de los siguientes códigos en tu sitio web.
        </p>
      </div>

      <Tabs defaultValue="iframe" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="iframe">iFrame</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="iframe" className="space-y-4">
          <div className="relative">
            <pre className="rounded-md bg-gray-100 p-4 overflow-x-auto text-sm">
              <code>{iframeCode}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(iframeCode, "iframe")}
            >
              {copiedIframe ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(iframeCode, "iframe")}>
              {copiedIframe ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedIframe ? "¡Copiado!" : "Copiar Código"}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="javascript" className="space-y-4">
          <div className="relative">
            <pre className="rounded-md bg-gray-100 p-4 overflow-x-auto text-sm">
              <code>{jsCode}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(jsCode, "js")}
            >
              {copiedJs ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(jsCode, "js")}>
              {copiedJs ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedJs ? "¡Copiado!" : "Copiar Código"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Vista Previa</h3>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
          <iframe
            src="/embed/iframe"
            width="100%"
            height="500"
            className="border-0 rounded-lg"
            title="Vista previa de la calculadora solar"
          />
        </div>
      </div>
    </div>
  )
}
