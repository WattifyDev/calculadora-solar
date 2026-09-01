import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AboutPage() {
    return (
        <div className="min-h-screen py-8 px-4 md:px-8 bg-background">
            <div className="max-w-3xl mx-auto space-y-10">
                <section className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Manual Rápido de Wattify</h1>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Usa Wattify para calcular el potencial solar de cualquier dirección, gestionar materiales y precios, ver resultados y exportar informes, o integrar la calculadora en tu web. Sigue estos pasos prácticos para aprovechar la plataforma.
                    </p>
                </section>

                <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-primary">¿Qué puedes hacer?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-base text-muted-foreground">
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Calcula el potencial solar de cualquier dirección.</li>
                            <li>Gestiona materiales y precios (solo administradores pueden crear o editar).</li>
                            <li>Visualiza y descarga resultados en PDF.</li>
                            <li>Integra la calculadora en tu propio sitio web.</li>
                            <li>Configura tus datos de cuenta y preferencias.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Panel de Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-base text-muted-foreground">
                        <ul className="list-disc pl-6 space-y-1">
                            <li><b>Envíos:</b> Consulta y gestiona todas las direcciones enviadas para análisis solar.</li>
                            <li><b>Materiales:</b> Administra materiales y precios (solo administradores pueden crear o editar).</li>
                            <li><b>Resultados:</b> Visualiza detalles y descarga informes PDF de cada análisis.</li>
                            <li><b>Configuración:</b> Actualiza tu información personal y preferencias.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Configuración de Márgenes y Correo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold mb-2">Personaliza tus márgenes</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                En la sección <b>Configuración</b> puedes ajustar los porcentajes de margen para cada servicio:
                            </p>
                            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                                <li>Puesta en marcha y legalización</li>
                                <li>Garantía y soporte</li>
                                <li>Herramienta de monitorización</li>
                                <li>Coste de estructura</li>
                                <li>Servicios de instalación</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold mb-2">Configuración de correo electrónico</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                <b>Importante:</b> Para poder enviar correos electrónicos con los resultados, debes completar la configuración SMTP en la sección <b>Configuración</b>:
                            </p>
                            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                                <li>Servidor SMTP y puerto</li>
                                <li>Usuario y contraseña de tu cuenta de correo</li>
                                <li>Dirección de correo remitente</li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-2">
                                Sin esta configuración, no podrás enviar resultados por correo electrónico a tus clientes.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Integración en tu Web</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold mb-2">Código de integración</h3>
                            <pre className="bg-muted p-4 rounded-lg border border-border text-foreground font-mono text-sm overflow-x-auto">
                                {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'TU_DOMINIO'}/embed.js" defer></script>`}
                            </pre>
                        </div>
                        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                            <li>Copia el código anterior y pégalo en la sección <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;body&gt;</code> de tu web donde quieras la calculadora.</li>
                            <li>En Wordpress, añade un bloque &quot;HTML&quot; con el código anterior en la página deseada.</li>
                            <li>Si no puedes añadir HTML directamente, usa el plugin <a href="https://wordpress.org/plugins/insert-headers-and-footers/" target="_blank" rel="noopener noreferrer" className="text-primary underline">WP Code</a>.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-primary">Preguntas Frecuentes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-base text-muted-foreground">
                        <b>¿Necesito una cuenta?</b>
                        <div>Sí, debes iniciar sesión para acceder a todas las funciones y guardar resultados.</div>
                        <b>¿Puedo exportar resultados?</b>
                        <div>Sí, puedes descargar los resultados en PDF desde la página de envíos.</div>
                        <b>¿Dónde configuro mis datos?</b>
                        <div>En la sección &quot;Configuración&quot; puedes actualizar tu información personal y preferencias.</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 