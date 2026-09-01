(async () => {
  // Get the origin from the script src
  const scriptElement = document.currentScript;
  if (!scriptElement) {
    console.error('Calculator widget could not be initialized: script element not found.');
    return;
  }
  const scriptUrl = new URL(scriptElement.src);
  const apiOrigin = scriptUrl.origin;

  let backendApiKey = '';
  let mapsApiKey = '';
  let detectedCountry = null;

  try {
    console.log('[EMBED] Fetching config from:', `${apiOrigin}/api/embed/config`);
    // The Referer header will be automatically sent by the browser
    const response = await fetch(`${apiOrigin}/api/embed/config`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to retrieve API keys.' }));
      throw new Error(errorData.error || `Error ${response.status}: Failed to retrieve API keys`);
    }
    const config = await response.json();
    console.log('[EMBED] Config received:', config);

    backendApiKey = config.backendApiKey;
    mapsApiKey = config.mapsApiKey;
    detectedCountry = config.detectedCountry;

    console.log('[EMBED] Detected country from backend:', detectedCountry);

    if (!backendApiKey || !mapsApiKey) {
      throw new Error('API key and Maps key are required but not provided by config.');
    }
  } catch (error) {
    console.error('Calculator widget initialization failed:', error.message);
    // Optionally, display a message in the embed location
    const errorDisplay = document.createElement('div');
    errorDisplay.textContent = `Error initializing widget: ${error.message}. Please contact support.`;
    errorDisplay.style.color = 'red';
    errorDisplay.style.padding = '10px';
    errorDisplay.style.border = '1px solid red';
    scriptElement.parentElement.insertBefore(errorDisplay, scriptElement);
    return;
  }

  const formOrigin = window.location.origin;

  // Load Google Maps API with provided key
  const loadGoogleMaps = () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`;
    document.head.appendChild(script);
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
    });
  };

  // Generate unique ID for this instance
  const containerId = 'solar-calc-' + Math.random().toString(36).substring(2, 9);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;800&display=swap');

    #${containerId} {
      all: initial;
      display: block !important;
      font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      line-height: normal !important;
      box-sizing: border-box !important;
      color-scheme: light !important;
    }
    
    #${containerId} * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #${containerId} .solar-calc__trigger-button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 254.21px !important;
      height: 47.6px !important;
      padding: 15px 30px !important;
      background-color: #CBFF54 !important;
      color: #063231 !important;
      border: none !important;
      border-radius: 100px !important;
      font-family: 'Roboto', sans-serif !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-transform: uppercase !important;
      box-shadow: none !important;
      text-decoration: none !important;
      white-space: nowrap !important;
    }

    #${containerId} .solar-calc__trigger-button:hover {
      background-color: #b8eb45 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(203, 255, 84, 0.3) !important;
    }

    #${containerId} .solar-calc__dialog {
      display: none !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background-color: rgba(0, 0, 0, 0.5) !important;
      z-index: 999999999 !important;
      overflow-y: auto !important;
      padding: 20px !important;
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.3s ease, visibility 0s linear 0.3s !important;
    }

    #${containerId} .solar-calc__dialog[open] {
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
      transition: opacity 0.3s ease !important;
    }

    #${containerId} .solar-calc__dialog-close {
      position: absolute !important;
      top: 20px !important;
      right: 20px !important;
      background: none !important;
      border: none !important;
      font-size: 24px !important;
      color: #6b7280 !important;
      cursor: pointer !important;
      padding: 8px !important;
      border-radius: 50% !important;
      line-height: 1 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
    }

    #${containerId} .solar-calc__dialog-close:hover {
      background-color: rgba(0, 0, 0, 0.05) !important;
      color: #111827 !important;
    }

    #${containerId} .solar-calc__container {
      position: relative !important;
      width: 100% !important;
      max-width: 700px !important;
      margin: 40px auto !important;
      padding: 32px !important;
      border: 1px solid rgba(229, 231, 235, 0.5) !important;
      border-radius: 16px !important;
      background: #ffffff !important;
      font-size: 16px !important;
      box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.1) !important;
      backdrop-filter: blur(16px) !important;
    }

    #${containerId} .solar-calc__title {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: #111827 !important;
      margin-bottom: 24px !important;
      font-family: inherit !important;
      line-height: 1.2 !important;
      text-align: center !important;
      letter-spacing: -0.02em !important;
    }

    #${containerId} .solar-calc__label {
      display: block !important;
      margin-bottom: 6px !important;
      font-weight: 500 !important;
      color: #374151 !important;
      font-size: 14px !important;
      line-height: 20px !important;
      text-align: left !important;
    }

    #${containerId} .solar-calc__input {
      width: 100% !important;
      padding: 10px 14px !important;
      margin: 4px 0 16px !important;
      border: 1.5px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 15px !important;
      line-height: 24px !important;
      color: #111827 !important;
      background-color: #ffffff !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      transition: all 0.2s ease !important;
    }

    #${containerId} .solar-calc__input:focus {
      outline: none !important;
      border-color: #22c55e !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    #${containerId} .solar-calc__button {
      display: block !important;
      width: 100% !important;
      padding: 12px 24px !important;
      margin-top: 24px !important;
      background-color: #22c55e !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-transform: none !important;
    }

    #${containerId} .solar-calc__button:hover {
      background-color: #16a34a !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15) !important;
    }

    #${containerId} .solar-calc__button:active {
      transform: translateY(0) !important;
    }

    #${containerId} .solar-calc__button--secondary {
      background-color: transparent !important;
      border: 1px solid #e5e7eb !important;
      color: #6b7280 !important;
      font-size: 13px !important;
      padding: 8px 16px !important;
      margin-top: 8px !important;
      border-radius: 6px !important;
      box-shadow: none !important;
      transition: all 0.15s ease !important;
    }

    #${containerId} .solar-calc__button--secondary:hover {
      background-color: #f9fafb !important;
      border-color: #d1d5db !important;
      color: #374151 !important;
      transform: none !important;
    }

    #${containerId} .solar-calc__button--secondary:active {
      background-color: #f3f4f6 !important;
      transform: scale(0.98) !important;
    }

    #${containerId} .solar-calc__button:disabled {
      background-color: #9ca3af !important;
      cursor: not-allowed !important;
      transform: none !important;
      box-shadow: none !important;
    }

    #${containerId} .solar-calc__error {
      color: #dc2626 !important;
      font-size: 14px !important;
      margin-top: 4px !important;
      display: block !important;
      padding: 8px 12px !important;
      background-color: #fef2f2 !important;
      border-radius: 6px !important;
      border: 1px solid #fee2e2 !important;
    }

    #${containerId} .solar-calc__checkbox-container {
      display: flex !important;
      align-items: flex-start !important;
      gap: 10px !important;
      margin: 20px 0 !important;
      padding: 16px !important;
      background-color: #f9fafb !important;
      border-radius: 8px !important;
      border: 1px solid #f3f4f6 !important;
    }

    #${containerId} .solar-calc__checkbox {
      margin-top: 4px !important;
      width: 16px !important;
      height: 16px !important;
      border-radius: 4px !important;
      border: 1.5px solid #d1d5db !important;
      cursor: pointer !important;
    }

    #${containerId} .solar-calc__checkbox:checked {
      background-color: #22c55e !important;
      border-color: #22c55e !important;
    }

    #${containerId} .solar-calc__checkbox-label {
      font-size: 14px !important;
      color: #4b5563 !important;
      line-height: 1.5 !important;
      flex: 1 !important;
      text-align: left !important;
    }

    #${containerId} .solar-calc__personal-info {
      margin-top: 32px !important;
      padding-top: 28px !important;
      border-top: 1px solid #f3f4f6 !important;
    }

    #${containerId} .solar-calc__map-container {
      height: 400px !important;
      width: 100% !important;
      margin: 12px 0 20px !important;
      border-radius: 12px !important;
      border: 1.5px solid #e5e7eb !important;
      overflow: hidden !important;
      position: relative !important;
      z-index: 1 !important;
      background: #f9fafb !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    }

    #${containerId} .solar-calc__location-container {
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      margin: 4px 0 16px !important;
    }

    #${containerId} .solar-calc__input--location {
      padding-right: 40px !important;
      margin: 0 !important;
    }

    #${containerId} .solar-calc__geolocation-button {
      position: absolute !important;
      right: 8px !important;
      top: 0 !important;
      transform: none !important;
      background: none !important;
      border: none !important;
      cursor: pointer !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 6px !important;
      transition: all 0.2s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 32px !important;
      height: 100% !important;
      font-size: 16px !important;
      line-height: 1 !important;
    }

    #${containerId} .solar-calc__geolocation-button:hover {
      background-color: #f3f4f6 !important;
    }

    #${containerId} .solar-calc__instruction {
      background-color: #eff6ff !important;
      border: 1px solid #bfdbfe !important;
      border-radius: 8px !important;
      padding: 12px 16px !important;
      margin: 12px 0 !important;
      font-size: 14px !important;
      color: #1e40af !important;
      line-height: 1.5 !important;
      text-align: left !important;
    }

    #${containerId} .solar-calc__instruction-icon {
      display: inline !important;
      margin-right: 8px !important;
      font-size: 16px !important;
    }

    #${containerId} .solar-calc__step {
      display: none !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease-in-out !important;
      min-height: 300px; /* Prevent layout shifts during transition */
    }

    #${containerId} .solar-calc__step.active {
      display: block !important;
      opacity: 1 !important;
    }

    #${containerId} .solar-calc__summary {
      background-color: #f8fafc !important;o
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 24px !important;
      margin: 20px 0 0 !important;
      padding-bottom: 12px !important;
    }

    #${containerId} .solar-calc__summary-title {
    margin-top: 10px !important;
      font-size: 20px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      margin-bottom: 16px !important;
      text-align: center !important;
    }

    #${containerId} .solar-calc__summary-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 16px !important;
    }

    #${containerId} .solar-calc__summary-item {
      text-align: center !important;
      padding: 20px !important; /* Increased padding */
      background: #ffffff !important;
      border-radius: 10px !important; /* Slightly more rounded */
      border: 1px solid #e2e8f0 !important; /* Softer border */
      box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important; /* Subtle shadow */
      transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    }

    #${containerId} .solar-calc__summary-item:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
    }

    #${containerId} .solar-calc__summary-label {
      font-size: 12px !important;
      color: #64748b !important;
      text-transform: uppercase !important;
      font-weight: 500 !important;
      margin-bottom: 4px !important;
    }

    #${containerId} .solar-calc__summary-value {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    #${containerId} .solar-calc__summary-average-price {
      display: block !important;
      width: 100% !important;
      text-align: center !important;
      margin-top: 32px !important;
      padding: 16px !important;
      font-size: 14px !important;
      color: #64748b !important;
      border-top: 1px solid #e2e8f0 !important;
    }

    #${containerId} .solar-calc__summary-loading {
      text-align: center !important;
      padding: 40px 20px !important;
    }

    #${containerId} .solar-calc__spinner {
      display: inline-block !important;
      width: 24px !important;
      height: 24px !important;
      border: 3px solid #e2e8f0 !important;
      border-top: 3px solid #22c55e !important;
      border-radius: 50% !important;
      animation: solar-calc-spin 1s linear infinite !important;
      margin-bottom: 12px !important;
    }

    /* New spinner for buttons */
    #${containerId} .solar-calc__button .solar-calc__button-spinner {
      display: none !important; /* Hidden by default */
      width: 16px !important;
      height: 16px !important;
      border: 2px solid rgba(255, 255, 255, 0.5) !important;
      border-top-color: #ffffff !important;
      border-radius: 50% !important;
      animation: solar-calc-spin 0.8s linear infinite !important;
      margin-right: 8px !important; /* Space between spinner and text */
      vertical-align: middle !important;
    }

    #${containerId} .solar-calc__button.loading .solar-calc__button-spinner {
      display: inline-block !important; /* Show when loading */
    }
    
    #${containerId} .solar-calc__button.loading .solar-calc__button-text {
      /* Optional: style text when loading, e.g., vertical-align if needed */
      vertical-align: middle !important;
    }

    @keyframes solar-calc-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    #${containerId} .solar-calc__back-button {
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      color: #475569 !important;
      font-size: 14px !important;
      padding: 8px 16px !important;
      margin-top: 16px !important;
      margin-right: 12px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    #${containerId} .solar-calc__back-button:hover {
      background-color: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
      color: #334155 !important;
    }

    #${containerId} .solar-calc__input-group {
      display: flex !important;
      align-items: stretch !important;
      width: 100% !important;
      margin-bottom: 16px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      border: 1.5px solid #e5e7eb !important;
      background: #fff !important;
    }
    #${containerId} .solar-calc__input--left {
      border: none !important;
      border-radius: 8px 0 0 8px !important;
      border-right: 1.5px solid #e5e7eb !important;
      margin: 0 !important;
      font-size: 15px !important;
      padding: 10px 14px !important;
      flex: 1 1 0 !important;
      min-width: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #${containerId} .solar-calc__input--right {
      border: none !important;
      border-radius: 0 8px 8px 0 !important;
      margin: 0 !important;
      font-size: 15px !important;
      padding: 10px 14px !important;
      width: 90px !important;
      min-width: 70px !important;
      background: transparent !important;
      box-shadow: none !important;
      flex: 0 0 auto !important;
    }
    #${containerId} .solar-calc__input--currency {
      appearance: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      text-align: left !important;
      cursor: pointer !important;
    }
    #${containerId} .solar-calc__input-group:focus-within {
      border-color: #22c55e !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
    }
    #${containerId} .solar-calc__roof-segments {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      margin-top: 20px !important;
    }
    #${containerId} .solar-calc__roof-segments-title {
      font-size: 15px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      margin-bottom: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
    #${containerId} .solar-calc__segment-card {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px !important;
      margin-bottom: 8px !important;
      border: 1.5px solid #e2e8f0 !important;
      border-radius: 8px !important;
      background: #f8fafc !important;
      transition: all 0.2s ease !important;
    }
    #${containerId} .solar-calc__segment-card:hover {
      border-color: #22c55e !important;
      background: #f0fdf4 !important;
    }
    #${containerId} .solar-calc__segment-badge {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
    }
    #${containerId} .solar-calc__segment-badge.grade-A { background-color: #22c55e !important; }
    #${containerId} .solar-calc__segment-badge.grade-B { background-color: #3b82f6 !important; }
    #${containerId} .solar-calc__segment-badge.grade-C { background-color: #f59e0b !important; }
    #${containerId} .solar-calc__segment-badge.grade-D { background-color: #64748b !important; }
  `;

  const formHtml = `
    <div id="${containerId}">
      <a href="javascript:void(0)" class="solar-calc__trigger-button" role="button">
        Calculadora solar
      </a>

      <div class="solar-calc__dialog">
        <div class="solar-calc__container">
          <button type="button" class="solar-calc__dialog-close" aria-label="Cerrar">×</button>
          <h2 class="solar-calc__title">Calculadora Solar</h2>
          
          <!-- Step 1: Data Collection -->
          <div id="step1-${containerId}" class="solar-calc__step active">
            <form id="solarCalculatorForm-${containerId}">
              <div>
                <label class="solar-calc__label" for="location-${containerId}">
                  Ubicación
                </label>
                <div class="solar-calc__location-container">
                  <input 
                    type="text" 
                    name="location" 
                    id="location-${containerId}"
                    class="solar-calc__input solar-calc__input--location" 
                    required
                    placeholder="Busca tu dirección"
                    autocomplete="off"
                  >
                  <button 
                    type="button" 
                    id="geolocation-${containerId}"
                    class="solar-calc__geolocation-button"
                    title="Usar mi ubicación actual"
                  >
                    📍
                  </button>
                </div>
                <div id="map-${containerId}" class="solar-calc__map-container"></div>
                <button 
                  type="button" 
                  id="resetPolygon-${containerId}"
                  class="solar-calc__button solar-calc__button--secondary"
                  style="display: none;" 
                >
                  ↻ Reiniciar selección
                </button>
                <div id="polygonStatus-${containerId}" class="solar-calc__instruction" style="display: none !important; background-color: #f0f9ff !important; border-color: #0ea5e9 !important; color: #0c4a6e !important;">
                  <span class="solar-calc__instruction-icon">📍</span>
                  <span id="polygonStatusText-${containerId}">Puntos seleccionados: 0/4</span>
                </div>
                <div class="solar-calc__instruction">
                  <span class="solar-calc__instruction-icon">ℹ️</span>
                  <strong>Instrucciones:</strong> Usa la vista satélite para ver claramente tu tejado. Haz clic en 4 puntos del mapa que coincidan con las esquinas del tejado de tu hogar para delimitar el área donde se instalarán los paneles solares. Puedes usar el botón "Resetear Puntos del Tejado" para empezar de nuevo.
                </div>
                <input type="hidden" name="polygonCoordinates" id="polygonCoordinates-${containerId}">
                <input type="hidden" name="latitude" id="latitude-${containerId}">
                <input type="hidden" name="longitude" id="longitude-${containerId}">
              </div>
              <div>
                <label class="solar-calc__label" for="consumption-${containerId}">
                  Consumo mensual medio (kWh)
                </label>
                <input 
                  type="number" 
                  name="consumption" 
                  id="consumption-${containerId}"
                  class="solar-calc__input" 
                  required 
                  min="0"
                  step="any"
                >
              </div>
              <div>
                <label class="solar-calc__label" for="averagePricePerKWh-${containerId}">
                  Precio medio de la electricidad (€/kWh) o (COP/kWh)
                  <span style="color: #64748b; font-size: 12px; margin-left: 4px;">(opcional)</span>
                </label>
                <div class="solar-calc__input-group">
                  <input 
                    type="number" 
                    name="averagePricePerKWh" 
                    id="averagePricePerKWh-${containerId}"
                    class="solar-calc__input solar-calc__input--left" 
                    min="0"
                    step="any"
                    placeholder="0.20"
                    aria-label="Precio medio de la electricidad (€/kWh)"
                  >
                  <select name="averagePriceCurrency" id="averagePriceCurrency-${containerId}" class="solar-calc__input solar-calc__input--currency solar-calc__input--right">
                    <option value="EUR">🇪🇸 EUR (€)</option>
                    <option value="COP">🇨🇴 COP ($)</option>
                    <option value="GTQ">🇬🇹 GTQ (Q)</option>
                  </select>
                </div>
                <div style="color: #6b7280; font-size: 13px;">Puedes obtenerlo en tu factura de la luz</div>
              </div>
              <div>
                <label class="solar-calc__label" for="panelApplication-${containerId}">
                  Tipo de Instalación
                </label>
                <select 
                  name="panelApplication" 
                  id="panelApplication-${containerId}" 
                  class="solar-calc__input"
                  required
                >
                  <option value="RESIDENCIAL">Residencial</option>
                  <option value="INDUSTRIAL">Industrial</option>
                </select>
              </div>
              <div>
                <label class="solar-calc__label" for="panelType-${containerId}">
                  Tipo de Panel
                </label>
                <select 
                  name="panelType" 
                  id="panelType-${containerId}" 
                  class="solar-calc__input"
                  required
                >
                  <option value="NORMAL">Normal</option>
                  <option value="BLACK">Black</option>
                </select>
              </div>

              <button type="button" id="calculateButton-${containerId}" class="solar-calc__button">
                <span class="solar-calc__button-spinner"></span>
                <span class="solar-calc__button-text">Calcular Potencial Solar</span>
              </button>
            </form>
          </div>

          <!-- Step 2: Solar Data Summary -->
          <div id="step2-${containerId}" class="solar-calc__step">
            <div id="summaryLoading-${containerId}" class="solar-calc__summary-loading">
              <div class="solar-calc__spinner"></div>
                              <p>Calculando tu potencial solar y preparando imagen aérea...</p>
            </div>
            <div id="summaryContent-${containerId}" class="solar-calc__summary" style="display: none;">
              <div class="solar-calc__summary-title">
                Tu Potencial Solar Estimado
              </div>
              <div class="solar-calc__summary-grid">
                <div class="solar-calc__summary-item">
                  <div class="solar-calc__summary-label">Paneles Recomendados</div>
                  <div class="solar-calc__summary-value" id="summaryPanels-${containerId}">-</div>
                </div>
                <div class="solar-calc__summary-item">
                  <div class="solar-calc__summary-label">Producción Anual</div>
                  <div class="solar-calc__summary-value" id="summaryProduction-${containerId}">-</div>
                </div>
                <div class="solar-calc__summary-item">
                  <div class="solar-calc__summary-label">Ahorro Anual</div>
                  <div class="solar-calc__summary-value" id="summarySavings-${containerId}">-</div>
                </div>
                <div class="solar-calc__summary-item">
                  <div class="solar-calc__summary-label">Coste Estimado</div>
                  <div class="solar-calc__summary-value" id="summaryCost-${containerId}">-</div>
                </div>
              </div>
            </div>
            <button type="button" id="backToForm-${containerId}" class="solar-calc__back-button">
              ← Volver
            </button>
            <button type="button" id="continueToContact-${containerId}" class="solar-calc__button" style="display: none;">
              Continuar - Solicitar Informe Completo
            </button>
          </div>

          <!-- Step 3: Personal Info -->
          <div id="step3-${containerId}" class="solar-calc__step">
            <form id="contactForm-${containerId}">
              <div class="solar-calc__personal-info">
                <div>
                  <label class="solar-calc__label" for="name-${containerId}">
                    Nombre
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    id="name-${containerId}"
                    class="solar-calc__input" 
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="surnames-${containerId}">
                    Apellidos
                  </label>
                  <input 
                    type="text" 
                    name="surnames" 
                    id="surnames-${containerId}"
                    class="solar-calc__input" 
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="phone-${containerId}">
                    Teléfono
                  </label>
                  <input 
                    type="tel" 
                    name="phone" 
                    id="phone-${containerId}"
                    class="solar-calc__input" 
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="email-${containerId}">
                    Email
                  </label>
                  <input 
                    type="email" 
                    name="email" 
                    id="email-${containerId}"
                    class="solar-calc__input" 
                    required
                  >
                </div>
                
                <div class="solar-calc__checkbox-container">
                  <input 
                    type="checkbox" 
                    name="consent" 
                    id="consent-${containerId}"
                    class="solar-calc__checkbox" 
                    required
                  >
                  <label class="solar-calc__checkbox-label" for="consent-${containerId}" id="consentLabel-${containerId}">
                    Consiento que Renovables del Henares SL guarde y use mis datos para gestionar mi solicitud de información sobre instalaciones solares, así como para el envío de comunicaciones relacionadas con sus servicios.
                  </label>
                </div>
              </div>

              <button type="button" id="backToSummary-${containerId}" class="solar-calc__back-button">
                ← Volver al Resumen
              </button>
              <button type="submit" id="submitContact-${containerId}" class="solar-calc__button">
                <span class="solar-calc__button-spinner"></span>
                <span class="solar-calc__button-text">Enviar Datos y Recibir Informe por Email</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Create a shadow DOM for style isolation
  const wrapper = document.createElement('div');
  const shadow = wrapper.attachShadow({ mode: 'open' });

  // Add styles to shadow DOM
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  shadow.appendChild(styleSheet);

  // Add form to shadow DOM
  const container = document.createElement('div');
  container.innerHTML = formHtml;
  shadow.appendChild(container);

  // Insert the wrapper where the script is
  if (scriptElement && scriptElement.parentElement) {
    scriptElement.parentElement.appendChild(wrapper);
  } else {
    console.error(
      'Calculator widget could not be appended to the DOM. Script element or its parent not found.',
      {
        scriptElementExists: !!scriptElement,
        parentElementExists: scriptElement ? !!scriptElement.parentElement : false,
      }
    );
    const errorMsg = document.createElement('div');
    errorMsg.textContent = 'Error: Calculadora Solar no pudo inicializarse correctamente (error de anclaje DOM).';
    errorMsg.style.color = 'red';
    if (scriptElement && scriptElement.parentNode) {
      scriptElement.parentNode.insertBefore(errorMsg, scriptElement);
    } else if (document.body) {
      document.body.insertBefore(errorMsg, document.body.firstChild);
    }
    return;
  }

  // Add dialog open/close functionality
  const triggerButton = shadow.querySelector('.solar-calc__trigger-button');
  const dialog = shadow.querySelector('.solar-calc__dialog');
  const closeButton = shadow.querySelector('.solar-calc__dialog-close');
  let autocomplete = null;
  let map = null;

  const openDialog = async () => {
    dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';

    // Initialize or reinitialize Google Maps and autocomplete when dialog opens
    if (!window.google || !window.google.maps) {
      try {
        await loadGoogleMaps();
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        return;
      }
    }

    // Delay initialization slightly to ensure the dialog is fully visible
    requestAnimationFrame(() => {
      initializeLocationFeatures();
    });
  };

  const closeDialog = () => {
    dialog.removeAttribute('open');
    document.body.style.overflow = '';
  };

  triggerButton.addEventListener('click', openDialog);
  closeButton.addEventListener('click', closeDialog);

  // Close dialog when clicking outside
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Close dialog on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.hasAttribute('open')) {
      closeDialog();
    }
  });

  const initializeLocationFeatures = () => {
    const locationInput = shadow.getElementById(`location-${containerId}`);
    const geoButton = shadow.getElementById(`geolocation-${containerId}`);
    const mapContainer = shadow.getElementById(`map-${containerId}`);
    const polygonCoordinatesInput = shadow.getElementById(`polygonCoordinates-${containerId}`);
    const resetPolygonButton = shadow.getElementById(`resetPolygon-${containerId}`);
    const latitudeHiddenInput = shadow.getElementById(`latitude-${containerId}`);
    const longitudeHiddenInput = shadow.getElementById(`longitude-${containerId}`);
    const polygonStatus = shadow.getElementById(`polygonStatus-${containerId}`);
    const polygonStatusText = shadow.getElementById(`polygonStatusText-${containerId}`);

    const MAX_POLYGON_POINTS = 4;
    let polygonPoints = [];
    let polygonMarkers = [];
    let drawnPolygon = null;

    // Function to update polygon status
    const updatePolygonStatus = () => {
      if (polygonStatusText) {
        polygonStatusText.textContent = `Puntos seleccionados: ${polygonPoints.length}/${MAX_POLYGON_POINTS}`;
      }
      if (polygonStatus) {
        if (polygonPoints.length > 0) {
          polygonStatus.style.display = 'block !important';
        } else {
          polygonStatus.style.display = 'none !important';
        }
      }
    };

    // Set default view based on detected country
    const defaultCenter = detectedCountry === 'Colombia' ? {
      lat: 4.8133,  // Pereira, Colombia
      lng: -75.6961
    } : {
      lat: 40.4168, // Madrid, Spain (default)
      lng: -3.7038
    };

    // Function to ensure PAC dropdown is visible and correctly parented
    const ensurePacDropdownIsVisible = () => {
      // Find all PAC containers in the main document
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => {
        // Ensure it's a direct child of the body
        if (container.parentElement !== document.body) {
          document.body.appendChild(container);
        }
        // Apply a high z-index
        container.style.zIndex = '9999999999';
      });
    };

    // Initialize map
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded. Cannot initialize location features.');
      if (mapContainer) {
        mapContainer.innerHTML = '<p style="color:red; text-align:center; padding-top: 20px;">Error: Google Maps no pudo cargarse.</p>';
      }
      return;
    }

    // Initialize map if not already initialized
    if (!map) {
      map = new google.maps.Map(mapContainer, {
        center: defaultCenter,
        zoom: 18,
        tilt: 0, // Disable 45 degree tilt to ensure top-down view
        heading: 0, // Ensure north is up
        mapTypeId: google.maps.MapTypeId.SATELLITE, // Use satellite imagery to see building roofs
        mapTypeControl: true, // Allow users to switch between map types
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.ROADMAP
          ]
        },
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
    }

    // Initialize Places Autocomplete
    if (!autocomplete && locationInput) {
      autocomplete = new google.maps.places.Autocomplete(locationInput, {
        componentRestrictions: { country: ["es", "co"] }, // Support both Spain and Colombia
        fields: ["geometry", "formatted_address"],
        types: ["address"]
      });

      // Force the autocomplete dropdown to be appended to body instead of shadow DOM
      // and ensure it's visible. Call with a slight delay.
      setTimeout(ensurePacDropdownIsVisible, 100);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log('[EMBED] Place changed:', place);

        if (latitudeHiddenInput) latitudeHiddenInput.value = '';
        if (longitudeHiddenInput) longitudeHiddenInput.value = '';
        clearOnlyPolygonDrawing();

        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          console.log('[EMBED] Setting coordinates:', { lat, lng });

          map.setCenter(place.geometry.location);
          map.setZoom(19);
          if (latitudeHiddenInput) latitudeHiddenInput.value = lat;
          if (longitudeHiddenInput) longitudeHiddenInput.value = lng;

          if (locationInput && place.formatted_address) {
            locationInput.value = place.formatted_address;
          } else if (locationInput && place.name) {
            locationInput.value = place.name;
          }

          console.log('[EMBED] Final values set:', {
            location: locationInput.value,
            latitude: latitudeHiddenInput.value,
            longitude: longitudeHiddenInput.value
          });

          // Add visual feedback that coordinates are set
          if (locationInput) {
            locationInput.style.borderColor = '#22c55e';
            locationInput.style.backgroundColor = '#f0fdf4';
          }
        } else {
          console.log('[EMBED] No geometry found for place:', place);
          if (locationInput) locationInput.value = place.name || '';
          map.setCenter(defaultCenter);
          map.setZoom(place.name && !place.geometry ? 10 : 6);
        }
      });
    }

    const clearOnlyPolygonDrawing = () => {
      polygonPoints = [];
      polygonMarkers.forEach(marker => marker.setMap(null));
      polygonMarkers = [];
      if (drawnPolygon) {
        drawnPolygon.setMap(null);
        drawnPolygon = null;
      }
      if (polygonCoordinatesInput) polygonCoordinatesInput.value = '';
      if (resetPolygonButton) resetPolygonButton.style.display = 'none';
      updatePolygonStatus();
    };

    const clearAllLocationAndPolygonData = () => {
      if (locationInput) locationInput.value = '';
      if (latitudeHiddenInput) latitudeHiddenInput.value = '';
      if (longitudeHiddenInput) longitudeHiddenInput.value = '';

      clearOnlyPolygonDrawing();

      map.setCenter(defaultCenter);
      map.setZoom(6);
    };

    if (resetPolygonButton) {
      resetPolygonButton.addEventListener('click', clearOnlyPolygonDrawing);
    }

    map.addListener("click", (e) => {
      if (polygonPoints.length >= MAX_POLYGON_POINTS) {
        return;
      }

      const clickedLatLng = e.latLng;
      polygonPoints.push(clickedLatLng);

      const pointMarker = new google.maps.Marker({
        position: clickedLatLng,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#0284c7',
          fillOpacity: 1,
          strokeWeight: 0
        }
      });
      polygonMarkers.push(pointMarker);

      resetPolygonButton.style.display = 'block';
      updatePolygonStatus();

      if (polygonPoints.length === MAX_POLYGON_POINTS) {
        if (drawnPolygon) {
          drawnPolygon.setMap(null);
        }
        drawnPolygon = new google.maps.Polygon({
          paths: polygonPoints,
          strokeColor: '#0284c7',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#0284c7',
          fillOpacity: 0.35,
          map: map
        });

        const coordinatesToStore = polygonPoints.map(p => ({ lat: p.lat(), lng: p.lng() }));
        polygonCoordinatesInput.value = JSON.stringify(coordinatesToStore);

        // Fallback: If main lat/lng and address text are empty, use polygon's first point
        if (latitudeHiddenInput && !latitudeHiddenInput.value &&
          longitudeHiddenInput && !longitudeHiddenInput.value &&
          locationInput && !locationInput.value.trim() &&
          polygonPoints.length > 0) {

          latitudeHiddenInput.value = polygonPoints[0].lat();
          longitudeHiddenInput.value = polygonPoints[0].lng();

          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: polygonPoints[0] }, (results, status) => {
            if (status === 'OK' && results[0] && locationInput) {
              locationInput.value = results[0].formatted_address;
            } else if (locationInput) {
              locationInput.value = "Área seleccionada en mapa";
            }
          });
        }

        const bounds = new google.maps.LatLngBounds();
        polygonPoints.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
      }
    });

    if (geoButton) {
      geoButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
          alert("La geolocalización no está soportada en este navegador.");
          return;
        }
        geoButton.disabled = true;

        if (latitudeHiddenInput) latitudeHiddenInput.value = '';
        if (longitudeHiddenInput) longitudeHiddenInput.value = '';
        clearOnlyPolygonDrawing();

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newCenter = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            console.log('[EMBED] Geolocation success:', newCenter);

            map.setCenter(newCenter);
            map.setZoom(15);

            if (latitudeHiddenInput) latitudeHiddenInput.value = position.coords.latitude;
            if (longitudeHiddenInput) longitudeHiddenInput.value = position.coords.longitude;

            console.log('[EMBED] Geolocation coordinates set:', {
              latitude: latitudeHiddenInput.value,
              longitude: longitudeHiddenInput.value
            });

            // Add visual feedback that coordinates are set
            if (locationInput) {
              locationInput.style.borderColor = '#22c55e';
              locationInput.style.backgroundColor = '#f0fdf4';
            }

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: newCenter }, (results, status) => {
              geoButton.disabled = false;
              if (status === 'OK' && results[0] && locationInput) {
                locationInput.value = results[0].formatted_address;
              } else if (locationInput) {
                locationInput.value = 'Ubicación actual';
                if (status !== 'OK' && status !== 'ZERO_RESULTS') console.warn('Reverse geocode error: ' + status);
              }
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            alert(
              'Error al obtener la ubicación. Por favor, introduce la dirección manualmente o selecciónala en el mapa.'
            );
            geoButton.disabled = false;
          }
        );
      });
    }

    if (locationInput) {
      locationInput.addEventListener('input', () => {
        if (!locationInput.value.trim()) {
          if (latitudeHiddenInput) latitudeHiddenInput.value = '';
          if (longitudeHiddenInput) longitudeHiddenInput.value = '';
          clearOnlyPolygonDrawing();
          map.setCenter(defaultCenter);
          map.setZoom(6);
        }
      });
      // Also ensure PAC is visible when user focuses on input
      locationInput.addEventListener('focus', () => {
        setTimeout(ensurePacDropdownIsVisible, 50);
      });
    }
  };

  // Add form submission handler and step navigation
  const form = shadow.querySelector(`#solarCalculatorForm-${containerId}`);
  const contactForm = shadow.querySelector(`#contactForm-${containerId}`);
  const calculateButton = shadow.querySelector(`#calculateButton-${containerId}`);
  const continueButton = shadow.querySelector(`#continueToContact-${containerId}`);
  const backToFormButton = shadow.querySelector(`#backToForm-${containerId}`);
  const backToSummaryButton = shadow.querySelector(`#backToSummary-${containerId}`);
  const submitContactButton = shadow.querySelector(`#submitContact-${containerId}`);

  let solarData = null;

  // Step navigation functions
  function showStep(stepNumber) {
    shadow.querySelectorAll('.solar-calc__step').forEach(step => {
      step.classList.remove('active');
    });
    shadow.querySelector(`#step${stepNumber}-${containerId}`).classList.add('active');
  }

  function formatCurrency(amount, currency = 'EUR') {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('es-ES').format(Math.round(num));
  }

  // Calculate solar data function
  async function calculateSolarData(selectedSegmentIndices = null) {
    const consumptionInput = shadow.getElementById(`consumption-${containerId}`);
    const locationInput = shadow.getElementById(`location-${containerId}`);
    const latitudeInput = shadow.getElementById(`latitude-${containerId}`);
    const longitudeInput = shadow.getElementById(`longitude-${containerId}`);
    const polygonInput = shadow.getElementById(`polygonCoordinates-${containerId}`);
    const averagePriceInput = shadow.getElementById(`averagePricePerKWh-${containerId}`);
    const averagePriceCurrencyInput = shadow.getElementById(`averagePriceCurrency-${containerId}`);
    const panelApplicationInput = shadow.getElementById(`panelApplication-${containerId}`);
    const panelTypeInput = shadow.getElementById(`panelType-${containerId}`);

    const formData = {
      consumption: consumptionInput.value,
      location: locationInput.value,
      latitude: latitudeInput.value,
      longitude: longitudeInput.value,
      polygonCoordinates: polygonInput.value,
      averagePricePerKWh: averagePriceInput && averagePriceInput.value ? averagePriceInput.value : undefined,
      averagePriceCurrency: averagePriceCurrencyInput && averagePriceCurrencyInput.value ? averagePriceCurrencyInput.value : 'EUR',
      panelApplication: panelApplicationInput.value,
      panelType: panelTypeInput.value,
      selectedSegmentIndices: selectedSegmentIndices && selectedSegmentIndices.length > 0 ? selectedSegmentIndices : undefined,
      origin: window.location.origin,
      pathname: window.location.pathname,
      referrer: document.referrer || null
    };

    // Debug: Log the form data being sent
    console.log('[EMBED] Form data being sent:', formData);

    // Check for missing required fields with detailed validation
    const validationErrors = [];

    if (!formData.consumption || formData.consumption.trim() === '') {
      validationErrors.push('Consumo mensual es obligatorio');
    }

    if (!formData.location || formData.location.trim() === '') {
      validationErrors.push('Ubicación es obligatoria');
    }

    if (!formData.latitude || formData.latitude.trim() === '') {
      validationErrors.push('Coordenadas no detectadas - por favor selecciona una ubicación del menú desplegable o usa el botón de geolocalización 📍');
    }

    if (!formData.longitude || formData.longitude.trim() === '') {
      validationErrors.push('Coordenadas no detectadas - por favor selecciona una ubicación del menú desplegable o usa el botón de geolocalización 📍');
    }

    if (validationErrors.length > 0) {
      console.error('[EMBED] Validation errors:', validationErrors);
      throw new Error(validationErrors.join('. '));
    }

    try {
      const response = await fetch(`${apiOrigin}/api/embed/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': backendApiKey
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error en el servidor');
      }

      return result.solarData;
    } catch (error) {
      console.error('Error calculating solar data:', error);
      throw error;
    }
  }

  // Update summary display
  function updateSummaryDisplay(data) {
    // Debug: Log the entire data object to see what we're receiving
    console.log('[EMBED] updateSummaryDisplay received data:', data);
    console.log('[EMBED] orthophotoUrl value:', data.orthophotoUrl);

    const panels = data.panelsCount || 0;
    const production = data.yearlyEnergyDcKwh || data.annualProduction || 0;
    const savings = data.estimatedAnnualSavingsAmount || 0;
    const cost = data.estimatedInstallationCostAmount || data.totalCost || 0;
    const currency = data.currencyCode || 'EUR';
    const averagePrice = data.averagePricePerKWh !== undefined && data.averagePricePerKWh !== null ? data.averagePricePerKWh : 0.20;
    const averagePriceCurrency = data.averagePriceCurrency || currency;

    // Display orthophoto if available
    let photoContainer = shadow.getElementById(`summaryPhoto-${containerId}`);
    if (!photoContainer) {
      photoContainer = document.createElement('div');
      photoContainer.id = `summaryPhoto-${containerId}`;
      photoContainer.style.marginBottom = '16px';
      shadow.getElementById(`summaryContent-${containerId}`).insertBefore(photoContainer, shadow.getElementById(`summaryContent-${containerId}`).firstChild);
    }
    if (data.orthophotoUrl) {
      console.log('[EMBED] Displaying preloaded orthophoto image:', data.orthophotoUrl);
      photoContainer.innerHTML = `<img src="${data.orthophotoUrl}" alt="Vista aérea" style="width:100%;border-radius:12px;max-height:300px;object-fit:cover;" />`;
    } else {
      console.log('[EMBED] No orthophotoUrl found, clearing photo container');
      photoContainer.innerHTML = '';
    }

    shadow.getElementById(`summaryPanels-${containerId}`).textContent = panels;
    shadow.getElementById(`summaryProduction-${containerId}`).textContent = formatNumber(production) + ' kWh';
    shadow.getElementById(`summarySavings-${containerId}`).textContent = formatCurrency(savings, currency);
    shadow.getElementById(`summaryCost-${containerId}`).textContent = formatCurrency(cost, currency);

    // Render roof segments (vertientes) if available
    let segmentsContainer = shadow.getElementById(`roofSegmentsContainer-${containerId}`);
    if (!segmentsContainer) {
      segmentsContainer = document.createElement('div');
      segmentsContainer.id = `roofSegmentsContainer-${containerId}`;
      segmentsContainer.className = 'solar-calc__roof-segments';
      const summaryContent = shadow.getElementById(`summaryContent-${containerId}`);
      summaryContent.appendChild(segmentsContainer);
    }

    if (data.roofSegments && data.roofSegments.length > 0) {
      segmentsContainer.style.display = 'block';
      let segmentsHtml = `
        <div class="solar-calc__roof-segments-title">
          <span>🏠 Vertientes del Tejado (${data.roofSegments.length})</span>
          <span style="font-size: 12px; font-weight: normal; color: #64748b;">Selecciona las áreas a utilizar</span>
        </div>
      `;

      data.roofSegments.forEach((seg, idx) => {
        const isChecked = seg.selected !== false;
        const badgeGrade = seg.performanceRating || 'B';
        const orientationLabel = seg.orientation || 'Sur';
        const pitch = Math.round(seg.pitchDegrees || 20);
        const area = Math.round((seg.areaMeters2 || 0) * 10) / 10;
        const segPanels = seg.panelsCount || 0;

        segmentsHtml += `
          <div class="solar-calc__segment-card">
            <div style="display: flex; align-items: center; gap: 12px;">
              <input 
                type="checkbox" 
                class="solar-calc__segment-checkbox-${containerId}" 
                value="${seg.segmentIndex}" 
                ${isChecked ? 'checked' : ''} 
                style="width: 18px !important; height: 18px !important; cursor: pointer !important;"
              />
              <div style="text-align: left;">
                <div style="font-weight: 600; font-size: 14px; color: #1e293b;">
                  Vertiente ${idx + 1}: ${orientationLabel} (${Math.round(seg.azimuthDegrees)}°)
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  Inclinación ${pitch}° • ${segPanels} paneles (${area} m²)
                </div>
              </div>
            </div>
            <div>
              <span class="solar-calc__segment-badge grade-${badgeGrade}">Grado ${badgeGrade}</span>
            </div>
          </div>
        `;
      });

      segmentsContainer.innerHTML = segmentsHtml;

      // Attach event listeners to checkboxes for dynamic recalculation
      const checkboxes = segmentsContainer.querySelectorAll(`.solar-calc__segment-checkbox-${containerId}`);
      checkboxes.forEach(cb => {
        cb.addEventListener('change', async () => {
          const selectedIndices = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => parseInt(c.value, 10));

          console.log('[EMBED] Recalculating with selected segment indices:', selectedIndices);

          try {
            // Show loading state briefly
            shadow.getElementById(`summaryPanels-${containerId}`).textContent = '...';
            shadow.getElementById(`summaryProduction-${containerId}`).textContent = '...';
            shadow.getElementById(`summarySavings-${containerId}`).textContent = '...';
            shadow.getElementById(`summaryCost-${containerId}`).textContent = '...';

            const updatedSolarData = await calculateSolarData(selectedIndices);
            solarData = updatedSolarData;
            updateSummaryDisplay(solarData);
          } catch (err) {
            console.error('[EMBED] Error recalculating segments:', err);
          }
        });
      });
    } else {
      segmentsContainer.style.display = 'none';
      segmentsContainer.innerHTML = '';
    }

    // Add or update a display for the average price used
    let priceInfo = shadow.getElementById(`summaryAveragePrice-${containerId}`);
    if (!priceInfo) {
      priceInfo = document.createElement('div');
      priceInfo.id = `summaryAveragePrice-${containerId}`;
      priceInfo.className = 'solar-calc__summary-average-price';
      shadow.getElementById(`summaryContent-${containerId}`).appendChild(priceInfo);
    }
    const currSymbol = averagePriceCurrency === 'COP' ? '$' : (averagePriceCurrency === 'GTQ' ? 'Q ' : '€');
    priceInfo.textContent = `Tarifa media de coste de electricidad utilizada: ${currSymbol}${averagePrice} / kWh`;
  }

  // Step 1: Calculate button click
  calculateButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validate form
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    calculateButton.classList.add('loading');
    calculateButton.disabled = true;

    try {
      showStep(2);

      // Fetch solar data first
      solarData = await calculateSolarData();

      // Wait for image to be ready if there's an orthophoto URL
      if (solarData.orthophotoUrl) {
        console.log('[EMBED] Preloading orthophoto before showing results');

        try {
          await Promise.race([
            // Image loading promise
            new Promise((resolve) => {
              const img = new Image();

              img.onload = () => {
                console.log('[EMBED] Orthophoto preloaded successfully');
                resolve();
              };

              img.onerror = () => {
                console.warn('[EMBED] Failed to preload orthophoto, showing results anyway');
                resolve(); // Still resolve to show the results without image
              };

              img.src = solarData.orthophotoUrl;
            }),
            // Timeout promise (10 seconds max)
            new Promise((resolve) => {
              setTimeout(() => {
                console.warn('[EMBED] Image preloading timeout, showing results anyway');
                resolve();
              }, 10000);
            })
          ]);
        } catch (imageError) {
          console.warn('[EMBED] Error preloading image:', imageError);
          // Continue anyway, updateSummaryDisplay will handle the error
        }
      }

      // Now show the results screen with everything ready
      shadow.getElementById(`summaryLoading-${containerId}`).style.display = 'none';
      shadow.getElementById(`summaryContent-${containerId}`).style.display = 'block';
      shadow.getElementById(`continueToContact-${containerId}`).style.display = 'block';

      updateSummaryDisplay(solarData);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = document.createElement('p');
      errorMessage.className = 'solar-calc__error';
      errorMessage.textContent = error.message || 'Error al calcular los datos solares. Por favor, intente nuevamente.';
      shadow.getElementById(`summaryContent-${containerId}`).appendChild(errorMessage);
      shadow.getElementById(`summaryLoading-${containerId}`).style.display = 'none';
    } finally {
      calculateButton.classList.remove('loading');
      calculateButton.disabled = false;
    }
  });

  // Step 2: Continue to contact form
  continueButton.addEventListener('click', () => {
    showStep(3);
  });

  // Back buttons
  backToFormButton.addEventListener('click', () => {
    showStep(1);
    // Reset summary display
    shadow.getElementById(`summaryLoading-${containerId}`).style.display = 'block';
    shadow.getElementById(`summaryContent-${containerId}`).style.display = 'none';
    shadow.getElementById(`continueToContact-${containerId}`).style.display = 'none';
  });

  backToSummaryButton.addEventListener('click', () => {
    showStep(2);
  });

  // Currency change handler - update placeholder based on selected currency
  const currencySelect = shadow.getElementById(`averagePriceCurrency-${containerId}`);
  const priceInput = shadow.getElementById(`averagePricePerKWh-${containerId}`);

  if (currencySelect && priceInput) {
    currencySelect.addEventListener('change', (e) => {
      const selectedCurrency = e.target.value;
      if (selectedCurrency === 'COP') {
        priceInput.placeholder = '986';
        priceInput.setAttribute('aria-label', 'Precio medio de la electricidad (COP/kWh)');
      } else {
        priceInput.placeholder = '0.20';
        priceInput.setAttribute('aria-label', 'Precio medio de la electricidad (€/kWh)');
      }
    });
  }

  // Auto-detect country and set default currency
  const detectCountryAndSetCurrency = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;

              // Use Google Maps Geocoding API to determine country
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${mapsApiKey}&language=es`;
              const response = await fetch(geocodeUrl);
              const data = await response.json();

              if (data.status === 'OK' && data.results && data.results.length > 0) {
                const result = data.results[0];
                const countryComponent = result.address_components.find(
                  component => component.types.includes('country')
                );

                if (countryComponent) {
                  const countryCode = countryComponent.short_name;

                  // Convert country code to full country name to match backend format
                  let countryName = null;
                  if (countryCode === 'CO') {
                    countryName = 'Colombia';
                  } else if (countryCode === 'ES') {
                    countryName = 'Spain';
                  }

                  // Set currency based on detected country
                  if (countryName) {
                    setDefaultCurrencyByCountry(countryName);
                  }
                }
              }
            } catch (error) {
              console.log('Error detecting country from coordinates:', error);
              // Fallback to EUR (already set as default)
            }
          },
          (error) => {
            console.log('Geolocation error or denied:', error);
            // Fallback to EUR (already set as default)
          },
          {
            timeout: 5000,
            enableHighAccuracy: false
          }
        );
      }
    } catch (error) {
      console.log('Error in country detection:', error);
      // Fallback to EUR (already set as default)
    }
  };

  // Set currency based on detected country from backend
  const setDefaultCurrencyByCountry = (country) => {
    console.log('[EMBED] setDefaultCurrencyByCountry called with:', country);
    console.log('[EMBED] currencySelect exists:', !!currencySelect);
    console.log('[EMBED] priceInput exists:', !!priceInput);

    if (!country || !currencySelect || !priceInput) {
      console.log('[EMBED] Early return due to missing parameters');
      return;
    }

    // Set currency based on country (using full country names from ipapi.co)
    if (country === 'Colombia' && currencySelect) {
      console.log('[EMBED] Setting currency to COP for Colombia');
      currencySelect.value = 'COP';
      priceInput.placeholder = '986';
      priceInput.setAttribute('aria-label', 'Precio medio de la electricidad (COP/kWh)');
    } else if (country === 'Spain' && currencySelect) {
      console.log('[EMBED] Setting currency to EUR for Spain');
      currencySelect.value = 'EUR';
      priceInput.placeholder = '0.20';
      priceInput.setAttribute('aria-label', 'Precio medio de la electricidad (€/kWh)');
    } else {
      console.log('[EMBED] Country not matched or keeping EUR default for:', country);
    }
    // For all other countries, keep EUR as default (already set in HTML)
  };

  // Apply country-based currency if detected, but allow user to override
  console.log('[EMBED] About to apply country-based currency. detectedCountry:', detectedCountry);
  if (detectedCountry) {
    console.log('[EMBED] Setting default currency for:', detectedCountry);
    setDefaultCurrencyByCountry(detectedCountry);

    // Update consent text based on detected country
    const consentLabel = shadow.getElementById(`consentLabel-${containerId}`);
    if (consentLabel && detectedCountry === 'Colombia') {
      consentLabel.textContent = 'Consiento que Wattify Colombia SAS guarde y use mis datos para gestionar mi solicitud de información sobre instalaciones solares, así como para el envío de comunicaciones relacionadas con sus servicios.';
    }
  } else {
    console.log('[EMBED] No detected country, keeping default currency (EUR)');
  }

  // Try to detect country when dialog opens, but don't block the UI
  if (window.google && window.google.maps && mapsApiKey) {
    detectCountryAndSetCurrency();
  }

  // Step 3: Submit contact form and send email
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Fix: define averagePriceInput in this scope
    const averagePriceInput = shadow.getElementById(`averagePricePerKWh-${containerId}`);
    const averagePriceCurrencyInput = shadow.getElementById(`averagePriceCurrency-${containerId}`);

    try {
      submitContactButton.classList.add('loading');
      submitContactButton.disabled = true;

      // Get all form data
      const contactData = new FormData(contactForm);
      const formData = new FormData(form);

      const data = {
        ...Object.fromEntries(formData),
        ...Object.fromEntries(contactData),
        averagePricePerKWh: averagePriceInput && averagePriceInput.value ? averagePriceInput.value : undefined,
        averagePriceCurrency: averagePriceCurrencyInput && averagePriceCurrencyInput.value ? averagePriceCurrencyInput.value : 'EUR',
        // panelApplication and panelType are already in formData from the main form
        origin: window.location.origin,
        pathname: window.location.pathname,
        referrer: document.referrer || null
      };

      const response = await fetch(`${apiOrigin}/api/embed/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': backendApiKey
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error en el servidor');
      }

      // Show brief inline success message
      const successMessage = document.createElement('p');
      successMessage.textContent = '¡Datos enviados correctamente!';
      successMessage.style.color = '#059669';
      successMessage.style.marginTop = '1rem';
      successMessage.style.padding = '16px';
      successMessage.style.backgroundColor = '#ecfdf5';
      successMessage.style.borderRadius = '8px';
      successMessage.style.border = '1px solid #a7f3d0';
      contactForm.appendChild(successMessage);

      contactForm.reset();
      form.reset();

      // Manually reset select elements to their first option if form.reset() doesn't do it reliably
      // (though typically it should)
      const panelApplicationSelect = shadow.getElementById(`panelApplication-${containerId}`);
      const panelTypeSelect = shadow.getElementById(`panelType-${containerId}`);
      if (panelApplicationSelect) panelApplicationSelect.selectedIndex = 0;
      if (panelTypeSelect) panelTypeSelect.selectedIndex = 0;

      // Display instructional popup before redirecting the user
      const senderEmail = result.senderEmail || 'InformeCalculadoraSolar';
      const customerName = data.name || '';

      const popupOverlay = document.createElement('div');
      popupOverlay.style.position = 'fixed';
      popupOverlay.style.top = '0';
      popupOverlay.style.left = '0';
      popupOverlay.style.width = '100%';
      popupOverlay.style.height = '100%';
      popupOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      popupOverlay.style.zIndex = '1000000000';
      popupOverlay.style.display = 'flex';
      popupOverlay.style.alignItems = 'center';
      popupOverlay.style.justifyContent = 'center';

      const popupBox = document.createElement('div');
      popupBox.style.backgroundColor = '#ffffff';
      popupBox.style.padding = '24px';
      popupBox.style.borderRadius = '12px';
      popupBox.style.maxWidth = '500px';
      popupBox.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
      popupBox.style.fontFamily = 'inherit';
      popupBox.style.lineHeight = '1.5';
      popupBox.style.textAlign = 'left';

      popupBox.innerHTML = `
        <p style="font-size:18px;font-weight:600;margin-bottom:16px;">¡Gracias ${customerName} por usar nuestra Calculadora de aprovechamiento Solar!</p>
        <p style="margin-bottom:12px;">En breve recibirás un mail con el informe completo desde la dirección <strong>${senderEmail}</strong>. Si en 5-10 minutos no lo has recibido, revisa la carpeta de SPAM para asegurar que recibes la información.</p>
        <p>Muchas gracias por confiar en Wattify.</p>
        <button id="popupClose-${containerId}" style="display:block;margin:24px auto 0;background:#22c55e;color:#ffffff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">Entendido</button>
      `;

      popupOverlay.appendChild(popupBox);
      document.body.appendChild(popupOverlay);

      const popupCloseBtn = document.getElementById(`popupClose-${containerId}`);
      if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', () => {
          window.location.href = window.location.origin;
        });
      } else {
        // Fallback: auto redirect after 10 seconds if button not found
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 10000);
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = document.createElement('p');
      errorMessage.className = 'solar-calc__error';
      errorMessage.textContent = error.message || 'Error al enviar los datos. Por favor, intente nuevamente.';
      contactForm.appendChild(errorMessage);
    } finally {
      submitContactButton.classList.remove('loading');
      submitContactButton.disabled = false;
    }
  });
})();