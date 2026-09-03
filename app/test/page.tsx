"use client";

import Script from "next/script";

export default function Test() {
    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "40px 20px", fontFamily: "sans-serif" }}>
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", background: "#ffffff", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                    🧪 Entorno de Prueba - Calculadora Solar Embed
                </h1>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
                    Haz clic en el botón inferior para abrir el modal interactivo de la Calculadora Solar de Wattify.
                </p>

                {/* Botón nativo embed insertado por embed.js o simulador Elementor */}
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                    <div className="elementor-element elementor-element-53bed2f" data-id="53bed2f">
                        <div className="elementor-button-wrapper">
                            <a className="elementor-button" href="#calculadora" style={{ display: "inline-block", background: "#CBFF54", color: "#063231", padding: "14px 28px", borderRadius: "999px", fontWeight: "800", textDecoration: "none", fontSize: "15px" }}>
                                ☀️ ABRIR CALCULADORA SOLAR
                            </a>
                        </div>
                    </div>
                </div>

                <div id="embed-mount-point" style={{ marginTop: "16px" }}></div>
            </div>

            <Script src="/embed.js" strategy="afterInteractive"></Script>
        </div>
    );
}
