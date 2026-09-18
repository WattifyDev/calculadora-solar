"use client";

import { useEffect, useRef, Suspense } from "react";
import Script from "next/script";

function CalculatorContent() {
    const triggerRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        // Disparo automático del modal interactivo al cargar la página
        let attempts = 0;
        const maxAttempts = 35; // 3.5 segundos máx
        let opened = false;

        const interval = setInterval(() => {
            attempts++;
            const trigger = triggerRef.current || document.querySelector<HTMLAnchorElement>('.solar-calc-open, a[href*="#calculadora"]');
            
            // Comprobamos si el componente embed ya ha insertado su contenedor o shadow root
            const embedElement = document.querySelector('[id^="solar-calc-"]') || document.querySelector('dialog');

            if (trigger && (embedElement || attempts > 6)) {
                if (!opened) {
                    trigger.click();
                    opened = true;
                }
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const handleManualOpen = () => {
        const trigger = triggerRef.current || document.querySelector<HTMLAnchorElement>('.solar-calc-open, a[href*="#calculadora"]');
        trigger?.click();
    };

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#033231",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>
            {/* Trigger invisible para el script embed.js */}
            <div className="elementor-element elementor-element-53bed2f" data-id="53bed2f" style={{ display: "none" }}>
                <div className="elementor-button-wrapper">
                    <a
                        ref={triggerRef}
                        className="elementor-button solar-calc-open"
                        href="#calculadora"
                    >
                        ☀️ ABRIR CALCULADORA SOLAR
                    </a>
                </div>
            </div>

            {/* Tarjeta corporativa oficial Wattify */}
            <div style={{
                maxWidth: "580px",
                width: "100%",
                textAlign: "center",
                background: "rgba(6, 50, 49, 0.92)",
                padding: "44px 32px",
                borderRadius: "24px",
                border: "1.5px solid rgba(203, 255, 84, 0.35)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(12px)",
                zIndex: 1
            }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                    <img
                        src="/wattifylogoblanco.png"
                        alt="Wattify"
                        style={{ height: "42px", width: "auto", objectFit: "contain" }}
                        onError={(e) => {
                            // Fallback si la ruta relativa no carga
                            (e.target as HTMLImageElement).src = "/wattifylogo.png";
                        }}
                    />
                </div>

                <div style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(203, 255, 84, 0.15)",
                    color: "#cbff54",
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: "16px"
                }}>
                    Herramienta Oficial Wattify
                </div>

                <h1 style={{
                    fontSize: "30px",
                    fontWeight: "900",
                    color: "#ffffff",
                    marginBottom: "12px",
                    lineHeight: "1.2"
                }}>
                    Calculadora Solar Inteligente
                </h1>

                <p style={{
                    color: "#cbd5e1",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    marginBottom: "32px"
                }}>
                    Calcula con precisión satelital el número óptimo de paneles solares, tu ahorro energético estimado y el retorno de inversión para tu hogar o empresa.
                </p>

                <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                        type="button"
                        onClick={handleManualOpen}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "16px 36px",
                            backgroundColor: "#cbff54",
                            color: "#033231",
                            borderRadius: "999px",
                            fontWeight: "800",
                            fontSize: "16px",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 10px 25px rgba(203, 255, 84, 0.35)",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#b4f625";
                            e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#cbff54";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        ☀️ Abrir Calculadora Solar
                    </button>
                </div>

                <div style={{
                    marginTop: "32px",
                    paddingTop: "24px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                    fontSize: "12px",
                    color: "#94a3b8"
                }}>
                    <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>📍 Satelital</div>
                        <div>Mapeo de tejado</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>⚡ Precisión</div>
                        <div>Datos de radiación</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>🎁 100% Gratis</div>
                        <div>Sin compromiso</div>
                    </div>
                </div>
            </div>

            {/* Inyección del script embed oficial de la calculadora */}
            <Script src="/embed.js" strategy="afterInteractive" />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", backgroundColor: "#033231", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbff54" }}>
                Cargando Calculadora Solar Wattify...
            </div>
        }>
            <CalculatorContent />
        </Suspense>
    );
}