import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import EmbedCodeDisplay from "@/components/embed-code-display"

export default function EmbedPage() {
  return (
    <div className="min-h-screen py-8 px-4 md:px-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
              Integración
            </h1>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed max-w-2xl">
              Integra la calculadora solar en tu sitio web o aplicación de manera sencilla y rápida.
            </p>
          </div>
        </div>

        <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-primary">
              Código de Integración
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Añade nuestra calculadora solar a tu sitio web con un simple copiar y pegar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmbedCodeDisplay />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
