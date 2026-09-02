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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@300;400;500;700&display=swap');

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
      font-family: 'Inter', 'Roboto', sans-serif !important;
      font-size: 16px !important;
      font-weight: 800 !important;
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
      background-color: rgba(6, 50, 49, 0.6) !important;
      backdrop-filter: blur(6px) !important;
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
      top: 16px !important;
      right: 18px !important;
      background: #f1f5f9 !important;
      border: 1px solid #e2e8f0 !important;
      font-size: 20px !important;
      color: #64748b !important;
      cursor: pointer !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 50% !important;
      line-height: 1 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      z-index: 10 !important;
    }

    #${containerId} .solar-calc__dialog-close:hover {
      background-color: #e2e8f0 !important;
      color: #0f172a !important;
    }

    #${containerId} .solar-calc__container {
      position: relative !important;
      width: 100% !important;
      max-width: 820px !important;
      margin: 24px auto !important;
      padding: 24px 28px !important;
      border: 1px solid rgba(229, 231, 235, 0.7) !important;
      border-radius: 20px !important;
      background: #ffffff !important;
      font-size: 15px !important;
      box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15) !important;
    }

    @media (max-width: 640px) {
      #${containerId} .solar-calc__dialog {
        padding: 0 !important;
      }
      #${containerId} .solar-calc__container {
        margin: 0 !important;
        border-radius: 0 !important;
        min-height: 100vh !important;
        max-width: 100% !important;
        padding: 16px !important;
      }
    }

    #${containerId} .solar-calc__step {
      display: none !important;
    }

    #${containerId} .solar-calc__step.active {
      display: block !important;
    }

    #${containerId} .solar-calc__header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 16px !important;
      padding-bottom: 12px !important;
      padding-right: 48px !important;
      border-bottom: 1px solid #f1f5f9 !important;
    }

    #${containerId} .solar-calc__brand {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    #${containerId} .solar-calc__logo {
      height: 28px !important;
      width: auto !important;
      object-fit: contain !important;
    }

    #${containerId} .solar-calc__title {
      font-family: 'Inter', sans-serif !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      color: #063231 !important;
      margin: 0 !important;
      letter-spacing: -0.02em !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    #${containerId} .solar-calc__step-pills {
      display: flex !important;
      gap: 6px !important;
      align-items: center !important;
    }

    #${containerId} .solar-calc__step-pill {
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 4px 10px !important;
      border-radius: 20px !important;
      background: #f1f5f9 !important;
      color: #64748b !important;
      transition: all 0.2s ease !important;
    }

    #${containerId} .solar-calc__step-pill.active {
      background: #CBFF54 !important;
      color: #063231 !important;
    }

    #${containerId} .solar-calc__capitals-bar {
      display: flex !important;
      gap: 8px !important;
      margin-bottom: 12px !important;
      align-items: center !important;
      flex-wrap: wrap !important;
    }

    #${containerId} .solar-calc__capitals-label {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #64748b !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-right: 4px !important;
    }

    #${containerId} .solar-calc__capital-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      border: 1px solid #e2e8f0 !important;
      background: #f8fafc !important;
      color: #1e293b !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    #${containerId} .solar-calc__capital-btn:hover {
      background: #f0fdf4 !important;
      border-color: #22c55e !important;
      transform: translateY(-1px) !important;
    }

    #${containerId} .solar-calc__capital-btn.active {
      background: #063231 !important;
      color: #CBFF54 !important;
      border-color: #063231 !important;
    }

    #${containerId} .solar-calc__label {
      display: block !important;
      margin-bottom: 4px !important;
      font-weight: 600 !important;
      color: #334155 !important;
      font-size: 13px !important;
      line-height: 18px !important;
      text-align: left !important;
    }

    #${containerId} .solar-calc__input {
      width: 100% !important;
      padding: 10px 14px !important;
      margin: 2px 0 12px !important;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 10px !important;
      font-size: 14px !important;
      line-height: 20px !important;
      color: #0f172a !important;
      background-color: #ffffff !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      transition: all 0.2s ease !important;
    }

    #${containerId} .solar-calc__input:focus {
      outline: none !important;
      border-color: #22c55e !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15) !important;
    }

    #${containerId} .solar-calc__map-container {
      height: 310px !important;
      width: 100% !important;
      margin: 8px 0 12px !important;
      border-radius: 14px !important;
      border: 1.5px solid #cbd5e1 !important;
      overflow: hidden !important;
      position: relative !important;
      z-index: 1 !important;
      background: #0f172a !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
    }

    @media (max-width: 640px) {
      #${containerId} .solar-calc__map-container {
        height: 250px !important;
      }
    }

    #${containerId} .solar-calc__map-overlay-guide {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 10px !important;
      padding: 8px 12px !important;
      margin-bottom: 12px !important;
      font-size: 12px !important;
      color: #475569 !important;
    }

    #${containerId} .solar-calc__action-bar {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      margin-top: 16px !important;
      padding-top: 12px !important;
      border-top: 1px solid #f1f5f9 !important;
    }

    #${containerId} .solar-calc__button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 12px 24px !important;
      background-color: #22c55e !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 10px !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      text-transform: none !important;
    }

    #${containerId} .solar-calc__button:hover {
      background-color: #16a34a !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25) !important;
    }

    #${containerId} .solar-calc__button--primary {
      flex: 1 !important;
    }

    #${containerId} .solar-calc__button--back {
      background-color: #f1f5f9 !important;
      color: #334155 !important;
      border: 1px solid #cbd5e1 !important;
      font-weight: 600 !important;
      padding: 12px 18px !important;
    }

    #${containerId} .solar-calc__button--back:hover {
      background-color: #e2e8f0 !important;
      color: #0f172a !important;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Screen 2: Country Badge and Consumption in kWh */
    #${containerId} .solar-calc__country-card {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 16px !important;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%) !important;
      border: 1px solid #86efac !important;
      border-radius: 12px !important;
      margin-bottom: 14px !important;
    }

    #${containerId} .solar-calc__country-info {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    #${containerId} .solar-calc__country-flag {
      font-size: 26px !important;
      line-height: 1 !important;
    }

    #${containerId} .solar-calc__country-name {
      font-size: 15px !important;
      font-weight: 700 !important;
      color: #065f46 !important;
    }

    #${containerId} .solar-calc__country-currency-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      background: #064e3b !important;
      color: #CBFF54 !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      padding: 5px 12px !important;
      border-radius: 20px !important;
    }

    /* Consumption kWh Box */
    #${containerId} .solar-calc__consumption-box {
      background: #ffffff !important;
      border: 1.5px solid #e2e8f0 !important;
      border-radius: 14px !important;
      padding: 16px !important;
      margin-bottom: 14px !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03) !important;
    }

    #${containerId} .solar-calc__consumption-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 10px !important;
    }

    #${containerId} .solar-calc__consumption-presets {
      display: flex !important;
      gap: 6px !important;
      margin-bottom: 12px !important;
    }

    #${containerId} .solar-calc__preset-btn {
      flex: 1 !important;
      padding: 6px 8px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      border: 1px solid #e2e8f0 !important;
      background: #f8fafc !important;
      border-radius: 6px !important;
      color: #475569 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      text-align: center !important;
    }

    #${containerId} .solar-calc__preset-btn:hover {
      background: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
    }

    #${containerId} .solar-calc__preset-btn.active {
      background: #064e3b !important;
      color: #CBFF54 !important;
      border-color: #064e3b !important;
    }

    #${containerId} .solar-calc__kwh-input-row {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      margin-bottom: 10px !important;
    }

    #${containerId} .solar-calc__kwh-input {
      flex: 1 !important;
      font-size: 22px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      border: 2px solid #22c55e !important;
      border-radius: 10px !important;
      padding: 8px 14px !important;
      background: #f0fdf4 !important;
      outline: none !important;
      text-align: right !important;
    }

    #${containerId} .solar-calc__kwh-unit {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: #64748b !important;
      white-space: nowrap !important;
    }

    #${containerId} .solar-calc__range-input {
      -webkit-appearance: none !important;
      appearance: none !important;
      width: 100% !important;
      height: 8px !important;
      border-radius: 5px !important;
      background: #e2e8f0 !important;
      outline: none !important;
      margin: 8px 0 !important;
      cursor: pointer !important;
      transition: background 0.15s ease !important;
    }

    #${containerId} .solar-calc__range-input::-webkit-slider-thumb {
      -webkit-appearance: none !important;
      appearance: none !important;
      width: 26px !important;
      height: 26px !important;
      border-radius: 50% !important;
      background: #22c55e !important;
      border: 3px solid #ffffff !important;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4) !important;
      cursor: grab !important;
      transition: transform 0.15s ease !important;
    }

    #${containerId} .solar-calc__range-input::-webkit-slider-thumb:active {
      transform: scale(1.15) !important;
      cursor: grabbing !important;
    }

    #${containerId} .solar-calc__range-input::-moz-range-thumb {
      width: 26px !important;
      height: 26px !important;
      border-radius: 50% !important;
      background: #22c55e !important;
      border: 3px solid #ffffff !important;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4) !important;
      cursor: grab !important;
    }

    #${containerId} .solar-calc__options-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
      margin-bottom: 12px !important;
    }

    @media (max-width: 640px) {
      #${containerId} .solar-calc__options-grid {
        grid-template-columns: 1fr !important;
      }
    }

    /* Premium Satellite Scanner Animation */
    #${containerId} .solar-calc__scanner-modal {
      display: none !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(255, 255, 255, 0.96) !important;
      backdrop-filter: blur(8px) !important;
      border-radius: 20px !important;
      z-index: 50 !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 32px !important;
      text-align: center !important;
    }

    #${containerId} .solar-calc__scanner-modal.visible {
      display: flex !important;
    }

    #${containerId} .solar-calc__radar-box {
      position: relative !important;
      width: 90px !important;
      height: 90px !important;
      margin-bottom: 20px !important;
    }

    #${containerId} .solar-calc__radar-circle {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      border: 2px solid #22c55e !important;
      border-radius: 50% !important;
      opacity: 0.3 !important;
    }

    #${containerId} .solar-calc__radar-sweep {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 42px !important;
      height: 42px !important;
      border-top: 3px solid #16a34a !important;
      border-right: 3px solid transparent !important;
      border-radius: 50% !important;
      transform-origin: 0% 0% !important;
      animation: solar-calc-sweep 1.2s linear infinite !important;
    }

    #${containerId} .solar-calc__radar-icon {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      font-size: 28px !important;
    }

    @keyframes solar-calc-sweep {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    #${containerId} .solar-calc__scanner-progress {
      width: 100% !important;
      max-width: 320px !important;
      height: 6px !important;
      background: #e2e8f0 !important;
      border-radius: 10px !important;
      overflow: hidden !important;
      margin-top: 14px !important;
    }

    #${containerId} .solar-calc__scanner-bar {
      height: 100% !important;
      width: 25% !important;
      background: linear-gradient(90deg, #22c55e, #CBFF54) !important;
      border-radius: 10px !important;
      transition: width 0.4s ease !important;
    }

    #${containerId} .solar-calc__scanner-status-text {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #0f172a !important;
      margin-top: 8px !important;
    }

    #${containerId} .solar-calc__scanner-sub-text {
      font-size: 12px !important;
      color: #64748b !important;
      margin-top: 4px !important;
    }

    /* Screen 3 (Results): Premium Wattify Aesthetic */
    #${containerId} .solar-calc__summary {
      background: #ffffff !important;
    }

    #${containerId} .solar-calc__summary-title {
      font-size: 18px !important;
      font-weight: 800 !important;
      color: #063231 !important;
      letter-spacing: -0.01em !important;
      margin-bottom: 16px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    #${containerId} .solar-calc__summary-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 12px !important;
      margin-bottom: 16px !important;
    }

    @media (max-width: 640px) {
      #${containerId} .solar-calc__summary-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    #${containerId} .solar-calc__summary-item {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 14px 12px !important;
      text-align: center !important;
      transition: all 0.2s ease !important;
    }

    #${containerId} .solar-calc__summary-item:hover {
      border-color: #22c55e !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.1) !important;
    }

    #${containerId} .solar-calc__summary-label {
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #64748b !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      margin-bottom: 6px !important;
    }

    #${containerId} .solar-calc__summary-value {
      font-size: 20px !important;
      font-weight: 800 !important;
      color: #063231 !important;
      letter-spacing: -0.02em !important;
    }

    #${containerId} .solar-calc__summary-average-price {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #f0fdf4 !important;
      border: 1px solid #86efac !important;
      color: #065f46 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      border-radius: 20px !important;
      margin-top: 8px !important;
      margin-bottom: 16px !important;
    }

    /* Screen 4 (Contact Form): Wattify Input Cards */
    #${containerId} .solar-calc__personal-info {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
      margin-bottom: 16px !important;
    }

    @media (max-width: 640px) {
      #${containerId} .solar-calc__personal-info {
        grid-template-columns: 1fr !important;
      }
    }

    #${containerId} .solar-calc__checkbox-container {
      grid-column: 1 / -1 !important;
      display: flex !important;
      align-items: flex-start !important;
      gap: 10px !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 10px !important;
      padding: 12px 14px !important;
      margin-top: 4px !important;
    }

    #${containerId} .solar-calc__checkbox {
      width: 18px !important;
      height: 18px !important;
      accent-color: #063231 !important;
      cursor: pointer !important;
      margin-top: 2px !important;
      flex-shrink: 0 !important;
    }

    #${containerId} .solar-calc__checkbox-label {
      font-size: 12px !important;
      line-height: 1.4 !important;
      color: #475569 !important;
      cursor: pointer !important;
    }

    #${containerId} .solar-calc__back-button {
      background: #f1f5f9 !important;
      color: #334155 !important;
      border: 1px solid #cbd5e1 !important;
      font-weight: 600 !important;
      padding: 12px 20px !important;
      border-radius: 10px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      font-size: 14px !important;
    }

    #${containerId} .solar-calc__back-button:hover {
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }
  `;

  const formHtml = `
    <div id="${containerId}">
      <a href="javascript:void(0)" class="solar-calc__trigger-button" role="button">
        Calculadora solar
      </a>

      <div class="solar-calc__dialog">
        <div class="solar-calc__container">
          <button type="button" class="solar-calc__dialog-close" aria-label="Cerrar">×</button>
          
          <div class="solar-calc__header">
            <div class="solar-calc__brand">
              <img src="/wattifylogo.png" alt="Wattify" class="solar-calc__logo" onerror="this.style.display='none'">
              <h2 class="solar-calc__title">
                <span>☀️</span> Calculadora Solar
              </h2>
            </div>
            <div class="solar-calc__step-pills">
              <span id="pill1-${containerId}" class="solar-calc__step-pill active">1. Ubicación</span>
              <span id="pill2-${containerId}" class="solar-calc__step-pill">2. Consumo</span>
              <span id="pill3-${containerId}" class="solar-calc__step-pill">3. Resultados</span>
            </div>
          </div>
          
          <!-- Screen 1: Location, Capital Selectors & Map Roof Selection -->
          <div id="step1a-${containerId}" class="solar-calc__step active">
            <div>
              <div class="solar-calc__capitals-bar">
                <span class="solar-calc__capitals-label">Ir directo a:</span>
                <button type="button" class="solar-calc__capital-btn" data-lat="40.4168" data-lng="-3.7038" data-country="Spain" data-currency="EUR" data-flag="🇪🇸" data-countryname="España">
                  <span>🇪🇸</span> Madrid
                </button>
                <button type="button" class="solar-calc__capital-btn" data-lat="4.7110" data-lng="-74.0721" data-country="Colombia" data-currency="COP" data-flag="🇨🇴" data-countryname="Colombia">
                  <span>🇨🇴</span> Bogotá
                </button>
                <button type="button" class="solar-calc__capital-btn" data-lat="14.6349" data-lng="-90.5069" data-country="Guatemala" data-currency="GTQ" data-flag="🇬🇹" data-countryname="Guatemala">
                  <span>🇬🇹</span> Ciudad de Guatemala
                </button>
              </div>

              <div class="solar-calc__location-container">
                <input 
                  type="text" 
                  name="location" 
                  id="location-${containerId}"
                  class="solar-calc__input solar-calc__input--location" 
                  required
                  placeholder="Busca tu dirección o municipio..."
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

              <div class="solar-calc__map-overlay-guide">
                <div>
                  <strong>🛰️ Traza tu tejado:</strong> Haz clic en 4 esquinas de tu tejado sobre la foto satélite para delimitar la superficie solar.
                </div>
                <button 
                  type="button" 
                  id="resetPolygon-${containerId}"
                  class="solar-calc__button solar-calc__button--secondary"
                  style="display: none; padding: 4px 10px !important; margin: 0 !important; font-size: 12px !important;" 
                >
                  ↻ Reiniciar
                </button>
              </div>

              <div id="polygonStatus-${containerId}" class="solar-calc__instruction" style="display: none !important; background-color: #f0f9ff !important; border-color: #0ea5e9 !important; color: #0c4a6e !important; padding: 8px 12px !important; margin: 6px 0 !important;">
                <span class="solar-calc__instruction-icon">📍</span>
                <span id="polygonStatusText-${containerId}">Puntos seleccionados: 0/4</span>
              </div>

              <input type="hidden" name="polygonCoordinates" id="polygonCoordinates-${containerId}">
              <input type="hidden" name="latitude" id="latitude-${containerId}">
              <input type="hidden" name="longitude" id="longitude-${containerId}">
            </div>

            <div class="solar-calc__action-bar">
              <span id="locationFeedback-${containerId}" style="font-size: 12px; color: #64748b;">Selecciona dirección o marca en el mapa</span>
              <button type="button" id="goToStep2-${containerId}" class="solar-calc__button solar-calc__button--primary">
                Siguiente: Consumo y Tarifa →
              </button>
            </div>
          </div>

          <!-- Screen 2: Consumption in kWh, Country Badge & Technical Details -->
          <div id="step1b-${containerId}" class="solar-calc__step">
            <form id="solarCalculatorForm-${containerId}">
              <!-- Auto-detected Country Badge with Flag -->
              <div class="solar-calc__country-card">
                <div class="solar-calc__country-info">
                  <span id="countryFlagBadge-${containerId}" class="solar-calc__country-flag">🇪🇸</span>
                  <div>
                    <div id="countryNameBadge-${containerId}" class="solar-calc__country-name">España detectada</div>
                    <div style="font-size: 11px; color: #047857;">Tarifa y radiación solar calculadas para esta región</div>
                  </div>
                </div>
                <div class="solar-calc__country-currency-badge">
                  <span id="countryCurrencyBadge-${containerId}">Moneda: EUR (€)</span>
                </div>
              </div>

              <!-- Interactive Consumption in kWh Box -->
              <div class="solar-calc__consumption-box">
                <div class="solar-calc__consumption-header">
                  <label class="solar-calc__label" for="consumptionDisplayInput-${containerId}" style="margin: 0;">
                    Consumo eléctrico mensual (kWh)
                  </label>
                  <span style="font-size: 11px; color: #64748b;">Máx. 350.000 kWh/mes</span>
                </div>

                <!-- Presets: Residencial vs Negocio vs Industrial -->
                <div class="solar-calc__consumption-presets">
                  <button type="button" class="solar-calc__preset-btn active" data-kwh="350">Hogar (350 kWh)</button>
                  <button type="button" class="solar-calc__preset-btn" data-kwh="800">Grande (800 kWh)</button>
                  <button type="button" class="solar-calc__preset-btn" data-kwh="3500">Comercio (3.500 kWh)</button>
                  <button type="button" class="solar-calc__preset-btn" data-kwh="25000">Industria (25.000 kWh)</button>
                </div>

                <!-- Direct Numeric Input -->
                <div class="solar-calc__kwh-input-row">
                  <input 
                    type="number" 
                    id="consumptionDisplayInput-${containerId}" 
                    class="solar-calc__kwh-input" 
                    min="10" 
                    max="350000" 
                    step="10" 
                    value="350"
                  >
                  <span class="solar-calc__kwh-unit">kWh / mes</span>
                </div>

                <!-- Range Slider up to 350,000 kWh -->
                <input 
                  type="range" 
                  id="kwhRangeSlider-${containerId}" 
                  class="solar-calc__range-input" 
                  min="50" 
                  max="5000" 
                  step="25" 
                  value="350"
                >

                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-weight: 500;">
                  <span>50 kWh</span>
                  <span id="estimatedBillHint-${containerId}" style="color: #047857; font-weight: 600;">~70 € / mes aprox.</span>
                  <span>5.000+ kWh (escribe para más)</span>
                </div>
              </div>

              <!-- Hidden consumption input for API -->
              <input type="hidden" name="consumption" id="consumption-${containerId}" value="350">

              <!-- Tarifa eléctrica de referencia (editable opcional) -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label class="solar-calc__label" for="averagePricePerKWh-${containerId}" style="margin: 0;">
                    Tarifa de electricidad por kWh
                  </label>
                  <select name="averagePriceCurrency" id="averagePriceCurrency-${containerId}" class="solar-calc__input" style="width: auto !important; padding: 4px 8px !important; margin: 0 !important; font-size: 12px !important; border-radius: 6px !important;">
                    <option value="EUR">🇪🇸 EUR (€)</option>
                    <option value="COP">🇨🇴 COP ($)</option>
                    <option value="GTQ">🇬🇹 GTQ (Q)</option>
                  </select>
                </div>
                <input 
                  type="number" 
                  name="averagePricePerKWh" 
                  id="averagePricePerKWh-${containerId}"
                  class="solar-calc__input" 
                  min="0" 
                  step="any" 
                  placeholder="0.20" 
                  style="margin-top: 4px !important;"
                >
              </div>

              <div class="solar-calc__options-grid">
                <div>
                  <label class="solar-calc__label" for="panelApplication-${containerId}">
                    Tipo de Inmueble
                  </label>
                  <select 
                    name="panelApplication" 
                    id="panelApplication-${containerId}" 
                    class="solar-calc__input"
                    required
                  >
                    <option value="RESIDENCIAL">Residencial / Hogar 🏡</option>
                    <option value="INDUSTRIAL">Comercial / Empresa 🏭</option>
                  </select>
                </div>
                <div>
                  <label class="solar-calc__label" for="panelType-${containerId}">
                    Estética de Paneles
                  </label>
                  <select 
                    name="panelType" 
                    id="panelType-${containerId}" 
                    class="solar-calc__input"
                    required
                  >
                    <option value="NORMAL">Normal de Alta Eficiencia</option>
                    <option value="BLACK">All-Black Premium ✨</option>
                  </select>
                </div>
              </div>

              <div class="solar-calc__action-bar">
                <button type="button" id="backToStep1a-${containerId}" class="solar-calc__button solar-calc__button--back">
                  ← Modificar Ubicación
                </button>
                <button type="button" id="calculateButton-${containerId}" class="solar-calc__button solar-calc__button--primary">
                  Calcular Potencial Solar ☀️
                </button>
              </div>
            </form>
          </div>

          <!-- Premium Satellite Scanner Modal Overlay -->
          <div id="scannerModal-${containerId}" class="solar-calc__scanner-modal" style="display: none;">
            <div class="solar-calc__radar-box">
              <div class="solar-calc__radar-circle"></div>
              <div class="solar-calc__radar-sweep"></div>
              <div class="solar-calc__radar-icon">🛰️</div>
            </div>
            <div class="solar-calc__scanner-status-text" id="scannerStatusText-${containerId}">
              Localizando edificio vía satélite...
            </div>
            <div class="solar-calc__scanner-sub-text" id="scannerSubText-${containerId}">
              Conectando con Google Solar y PVGIS API
            </div>
            <div class="solar-calc__scanner-progress">
              <div class="solar-calc__scanner-bar" id="scannerProgressBar-${containerId}"></div>
            </div>
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
            <div class="solar-calc__action-bar">
              <button type="button" id="backToForm-${containerId}" class="solar-calc__button solar-calc__button--back">
                ← Volver al Consumo
              </button>
              <button type="button" id="continueToContact-${containerId}" class="solar-calc__button solar-calc__button--primary" style="display: none;">
                Solicitar Informe y Propuesta Oficial →
              </button>
            </div>
          </div>

          <!-- Step 3: Personal Info -->
          <div id="step3-${containerId}" class="solar-calc__step">
            <div style="margin-bottom: 14px;">
              <h3 style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: #063231; margin-bottom: 4px;">
                📄 ¿A dónde te enviamos el estudio solar completo?
              </h3>
              <p style="font-size: 12px; color: #64748b;">
                Generaremos tu propuesta técnica detallada con desglose de amortización e impacto ambiental en PDF.
              </p>
            </div>

            <form id="contactForm-${containerId}">
              <div class="solar-calc__personal-info">
                <div>
                  <label class="solar-calc__label" for="name-${containerId}">
                    Nombre *
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    id="name-${containerId}"
                    class="solar-calc__input" 
                    placeholder="Ej. Juan"
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="surnames-${containerId}">
                    Apellidos *
                  </label>
                  <input 
                    type="text" 
                    name="surnames" 
                    id="surnames-${containerId}"
                    class="solar-calc__input" 
                    placeholder="Ej. Pérez García"
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="phone-${containerId}">
                    Teléfono *
                  </label>
                  <input 
                    type="tel" 
                    name="phone" 
                    id="phone-${containerId}"
                    class="solar-calc__input" 
                    placeholder="Ej. 600 000 000"
                    required
                  >
                </div>
                <div>
                  <label class="solar-calc__label" for="email-${containerId}">
                    Correo Electrónico *
                  </label>
                  <input 
                    type="email" 
                    name="email" 
                    id="email-${containerId}"
                    class="solar-calc__input" 
                    placeholder="tu@email.com"
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
                    Consiento que Wattify guarde y use mis datos para gestionar mi estudio solar personalizado y enviarme la propuesta técnica sin compromiso.
                  </label>
                </div>
              </div>

              <div class="solar-calc__action-bar">
                <button type="button" id="backToSummary-${containerId}" class="solar-calc__button solar-calc__button--back">
                  ← Volver al Resumen
                </button>
                <button type="submit" id="submitContact-${containerId}" class="solar-calc__button solar-calc__button--primary">
                  <span class="solar-calc__button-spinner"></span>
                  <span class="solar-calc__button-text">Recibir Propuesta Solar por Email 📩</span>
                </button>
              </div>
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
  let showStep = null;

  const openDialog = async () => {
    dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';

    // Always reset to Step 1a (Location & Roof Map)
    if (typeof showStep === 'function') {
      showStep('step1a');
    }

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
        componentRestrictions: { country: ["es", "co", "gt"] }, // Support Spain, Colombia, and Guatemala
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
  const goToStep2Btn = shadow.querySelector(`#goToStep2-${containerId}`);
  const backToStep1aBtn = shadow.querySelector(`#backToStep1a-${containerId}`);

  let solarData = null;

  // Active country state (defaults to Spain / EUR)
  let currentCountryInfo = {
    country: 'Spain',
    countryName: 'España',
    flag: '🇪🇸',
    currency: 'EUR',
    symbol: '€',
    priceKwh: 0.20
  };

  // Step navigation functions
  showStep = function(stepName) {
    shadow.querySelectorAll('.solar-calc__step').forEach(step => {
      step.classList.remove('active');
    });

    const targetStep = shadow.querySelector(`#${stepName}-${containerId}`);
    if (targetStep) {
      targetStep.classList.add('active');
    }

    // Update pill indicators
    const pill1 = shadow.querySelector(`#pill1-${containerId}`);
    const pill2 = shadow.querySelector(`#pill2-${containerId}`);
    const pill3 = shadow.querySelector(`#pill3-${containerId}`);

    if (pill1 && pill2 && pill3) {
      pill1.classList.remove('active');
      pill2.classList.remove('active');
      pill3.classList.remove('active');

      if (stepName === 'step1a') {
        pill1.classList.add('active');
      } else if (stepName === 'step1b') {
        pill2.classList.add('active');
      } else if (stepName === 'step2' || stepName === 'step3') {
        pill3.classList.add('active');
      }
    }
  }

  // Update country visual badge & parameters
  function applyCountryVisuals(countryData) {
    currentCountryInfo = { ...currentCountryInfo, ...countryData };
    
    const flagBadge = shadow.querySelector(`#countryFlagBadge-${containerId}`);
    const nameBadge = shadow.querySelector(`#countryNameBadge-${containerId}`);
    const currencyBadge = shadow.querySelector(`#countryCurrencyBadge-${containerId}`);
    const currencySelect = shadow.querySelector(`#averagePriceCurrency-${containerId}`);
    const priceInput = shadow.querySelector(`#averagePricePerKWh-${containerId}`);

    if (flagBadge) flagBadge.textContent = currentCountryInfo.flag;
    if (nameBadge) nameBadge.textContent = `${currentCountryInfo.countryName} detectada`;
    if (currencyBadge) currencyBadge.textContent = `Moneda: ${currentCountryInfo.currency} (${currentCountryInfo.symbol})`;

    if (currencySelect) currencySelect.value = currentCountryInfo.currency;
    if (priceInput) priceInput.placeholder = String(currentCountryInfo.priceKwh);

    // Update bill hint for current consumption
    const consumptionInput = shadow.querySelector(`#consumption-${containerId}`);
    const currentVal = consumptionInput ? parseFloat(consumptionInput.value) || 350 : 350;
    updateConsumptionValue(currentVal);
  }

  // Update consumption value across all inputs (direct numeric, range slider and hidden input)
  function updateConsumptionValue(kwhVal) {
    let numericVal = Math.round(parseFloat(kwhVal) || 0);
    if (numericVal < 10) numericVal = 10;
    if (numericVal > 350000) numericVal = 350000;

    const numInput = shadow.querySelector(`#consumptionDisplayInput-${containerId}`);
    const rangeSlider = shadow.querySelector(`#kwhRangeSlider-${containerId}`);
    const hiddenInput = shadow.querySelector(`#consumption-${containerId}`);
    const billHint = shadow.querySelector(`#estimatedBillHint-${containerId}`);

    if (numInput && document.activeElement !== numInput) {
      numInput.value = numericVal;
    }
    if (rangeSlider && numericVal <= 5000) {
      rangeSlider.value = numericVal;
    }
    if (hiddenInput) {
      hiddenInput.value = numericVal;
    }

    // Update estimated bill hint based on local tariff
    if (billHint) {
      const approxBill = Math.round(numericVal * (currentCountryInfo.priceKwh || 0.20));
      billHint.textContent = `~${approxBill.toLocaleString('es-ES')} ${currentCountryInfo.symbol} / mes aprox.`;
    }

    // Highlight matching preset button if any
    shadow.querySelectorAll('.solar-calc__preset-btn').forEach(btn => {
      if (parseInt(btn.dataset.kwh, 10) === numericVal) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Setup direct numeric input listener
  const directKwhInput = shadow.querySelector(`#consumptionDisplayInput-${containerId}`);
  if (directKwhInput) {
    directKwhInput.addEventListener('input', (e) => {
      updateConsumptionValue(e.target.value);
    });
  }

  // Setup range slider listener
  const kwhRangeSlider = shadow.querySelector(`#kwhRangeSlider-${containerId}`);
  if (kwhRangeSlider) {
    kwhRangeSlider.addEventListener('input', (e) => {
      updateConsumptionValue(e.target.value);
    });
  }

  // Setup preset buttons (Hogar 350, Grande 800, Comercio 3500, Industria 25000)
  const presetBtns = shadow.querySelectorAll('.solar-calc__preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const kwh = parseInt(btn.dataset.kwh, 10);
      updateConsumptionValue(kwh);
    });
  });

  // Setup Capital Buttons (Madrid, Bogotá, Ciudad de Guatemala)
  const capitalBtns = shadow.querySelectorAll('.solar-calc__capital-btn');
  capitalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      capitalBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);
      const country = btn.dataset.country;
      const currency = btn.dataset.currency;
      const flag = btn.dataset.flag;
      const countryname = btn.dataset.countryname;

      if (map) {
        map.setCenter({ lat, lng });
        map.setZoom(16);
      }

      const latInput = shadow.querySelector(`#latitude-${containerId}`);
      const lngInput = shadow.querySelector(`#longitude-${containerId}`);
      const locInput = shadow.querySelector(`#location-${containerId}`);
      const feedback = shadow.querySelector(`#locationFeedback-${containerId}`);

      if (latInput) latInput.value = lat;
      if (lngInput) lngInput.value = lng;
      if (locInput) {
        locInput.value = `${countryname} (Centro)`;
        locInput.style.borderColor = '#22c55e';
        locInput.style.backgroundColor = '#f0fdf4';
      }
      if (feedback) {
        feedback.textContent = `📍 Ubicado en ${countryname}. Ahora traza tu tejado.`;
        feedback.style.color = '#15803d';
      }

      // Configure country params
      let params = {
        country: country,
        countryName: countryname,
        flag: flag,
        currency: currency,
        symbol: currency === 'COP' ? '$' : (currency === 'GTQ' ? 'Q' : '€'),
        priceKwh: currency === 'COP' ? 986 : (currency === 'GTQ' ? 1.60 : 0.20)
      };
      applyCountryVisuals(params);
    });
  });

  // Navigation: Go from Step 1a to Step 1b
  if (goToStep2Btn) {
    goToStep2Btn.addEventListener('click', () => {
      const latInput = shadow.querySelector(`#latitude-${containerId}`);
      const lngInput = shadow.querySelector(`#longitude-${containerId}`);
      const locInput = shadow.querySelector(`#location-${containerId}`);
      const feedback = shadow.querySelector(`#locationFeedback-${containerId}`);

      if ((!latInput || !latInput.value) && (!locInput || !locInput.value.trim())) {
        if (feedback) {
          feedback.textContent = '⚠️ Por favor busca una dirección o selecciona una capital.';
          feedback.style.color = '#dc2626';
        }
        if (locInput) locInput.focus();
        return;
      }

      // Auto-detect country based on address text or coordinates
      const address = (locInput && locInput.value) ? locInput.value.toLowerCase() : '';
      const latVal = latInput && latInput.value ? parseFloat(latInput.value) : null;
      const lngVal = lngInput && lngInput.value ? parseFloat(lngInput.value) : null;

      // Coordinate boundary heuristics:
      // Guatemala: Lat ~13 to ~18, Lng ~ -92.5 to -88
      // Colombia: Lat ~ -4.5 to ~13.5, Lng ~ -79 to -66.5
      // Spain: Lat ~27 to ~44, Lng ~ -18 to ~5
      let detectedCountry = 'Spain';

      if (address.includes('guatemala') || address.includes(', gt') || (latVal && latVal >= 13 && latVal <= 18.5 && lngVal && lngVal <= -88 && lngVal >= -93)) {
        detectedCountry = 'Guatemala';
      } else if (address.includes('colombia') || address.includes('bogot') || address.includes('medell') || address.includes('cali') || address.includes('pereira') || address.includes(', co') || (latVal && latVal >= -4.5 && latVal <= 13.5 && lngVal && lngVal <= -66 && lngVal >= -80)) {
        detectedCountry = 'Colombia';
      }

      if (detectedCountry === 'Guatemala') {
        applyCountryVisuals({
          country: 'Guatemala',
          countryName: 'Guatemala',
          flag: '🇬🇹',
          currency: 'GTQ',
          symbol: 'Q',
          priceKwh: 1.60
        });
      } else if (detectedCountry === 'Colombia') {
        applyCountryVisuals({
          country: 'Colombia',
          countryName: 'Colombia',
          flag: '🇨🇴',
          currency: 'COP',
          symbol: '$',
          priceKwh: 986
        });
      } else {
        applyCountryVisuals({
          country: 'Spain',
          countryName: 'España',
          flag: '🇪🇸',
          currency: 'EUR',
          symbol: '€',
          priceKwh: 0.20
        });
      }

      showStep('step1b');
    });
  }

  // Navigation: Back from Step 1b to Step 1a
  if (backToStep1aBtn) {
    backToStep1aBtn.addEventListener('click', () => {
      showStep('step1a');
    });
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
      consumption: consumptionInput ? consumptionInput.value : '350',
      location: locationInput ? locationInput.value : '',
      latitude: latitudeInput ? latitudeInput.value : '',
      longitude: longitudeInput ? longitudeInput.value : '',
      polygonCoordinates: polygonInput ? polygonInput.value : '',
      averagePricePerKWh: averagePriceInput && averagePriceInput.value ? averagePriceInput.value : undefined,
      averagePriceCurrency: averagePriceCurrencyInput && averagePriceCurrencyInput.value ? averagePriceCurrencyInput.value : currentCountryInfo.currency,
      panelApplication: panelApplicationInput ? panelApplicationInput.value : 'RESIDENCIAL',
      panelType: panelTypeInput ? panelTypeInput.value : 'NORMAL',
      selectedSegmentIndices: selectedSegmentIndices && selectedSegmentIndices.length > 0 ? selectedSegmentIndices : undefined,
      origin: window.location.origin,
      pathname: window.location.pathname,
      referrer: document.referrer || null
    };

    console.log('[EMBED] Form data being sent:', formData);

    const validationErrors = [];
    if (!formData.consumption || formData.consumption.trim() === '') {
      validationErrors.push('Consumo mensual es obligatorio');
    }
    if (!formData.location || formData.location.trim() === '') {
      validationErrors.push('Ubicación es obligatoria');
    }
    if (!formData.latitude || formData.latitude.trim() === '' || !formData.longitude || formData.longitude.trim() === '') {
      validationErrors.push('Coordenadas no detectadas - por favor selecciona una capital o busca en el mapa');
    }

    if (validationErrors.length > 0) {
      console.error('[EMBED] Validation errors:', validationErrors);
      throw new Error(validationErrors.join('. '));
    }

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
  }

  // Update summary display
  function updateSummaryDisplay(data) {
    console.log('[EMBED] updateSummaryDisplay received data:', data);

    const panels = data.panelsCount || 0;
    const production = data.yearlyEnergyDcKwh || data.annualProduction || 0;
    const savings = data.estimatedAnnualSavingsAmount || 0;
    const cost = data.estimatedInstallationCostAmount || data.totalCost || 0;
    const currency = data.currencyCode || currentCountryInfo.currency || 'EUR';
    const averagePrice = data.averagePricePerKWh !== undefined && data.averagePricePerKWh !== null ? data.averagePricePerKWh : currentCountryInfo.priceKwh;
    const averagePriceCurrency = data.averagePriceCurrency || currency;

    let photoContainer = shadow.getElementById(`summaryPhoto-${containerId}`);
    if (!photoContainer) {
      photoContainer = document.createElement('div');
      photoContainer.id = `summaryPhoto-${containerId}`;
      photoContainer.style.marginBottom = '16px';
      shadow.getElementById(`summaryContent-${containerId}`).insertBefore(photoContainer, shadow.getElementById(`summaryContent-${containerId}`).firstChild);
    }
    if (data.orthophotoUrl) {
      photoContainer.innerHTML = `<img src="${data.orthophotoUrl}" alt="Vista aérea" style="width:100%;border-radius:12px;max-height:300px;object-fit:cover;" />`;
    } else {
      photoContainer.innerHTML = '';
    }

    shadow.getElementById(`summaryPanels-${containerId}`).textContent = panels;
    shadow.getElementById(`summaryProduction-${containerId}`).textContent = formatNumber(production) + ' kWh';
    shadow.getElementById(`summarySavings-${containerId}`).textContent = formatCurrency(savings, currency);
    shadow.getElementById(`summaryCost-${containerId}`).textContent = formatCurrency(cost, currency);

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

      const checkboxes = segmentsContainer.querySelectorAll(`.solar-calc__segment-checkbox-${containerId}`);
      checkboxes.forEach(cb => {
        cb.addEventListener('change', async () => {
          const selectedIndices = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => parseInt(c.value, 10));

          try {
            shadow.getElementById(`summaryPanels-${containerId}`).textContent = '...';
            shadow.getElementById(`summaryProduction-${containerId}`).textContent = '...';
            shadow.getElementById(`summarySavings-${containerId}`).textContent = '...';
            shadow.getElementById(`summaryCost-${containerId}`).textContent = '...';

            const updatedSolarData = await calculateSolarData(selectedIndices);
            solarData = updatedSolarData;
            updateSummaryDisplay(solarData);
          } catch (err) {
            console.error('Segment recalculation error:', err);
          }
        });
      });
    } else {
      segmentsContainer.style.display = 'none';
      segmentsContainer.innerHTML = '';
    }

    let priceInfo = shadow.getElementById(`summaryAveragePrice-${containerId}`);
    if (!priceInfo) {
      priceInfo = document.createElement('div');
      priceInfo.id = `summaryAveragePrice-${containerId}`;
      priceInfo.className = 'solar-calc__summary-average-price';
      shadow.getElementById(`summaryContent-${containerId}`).appendChild(priceInfo);
    }
    const currSymbol = averagePriceCurrency === 'COP' ? '$' : (averagePriceCurrency === 'GTQ' ? 'Q ' : '€');
    priceInfo.textContent = `Tarifa media de electricidad utilizada: ${currSymbol}${averagePrice} / kWh`;
  }

  // Calculate Button Click with Satellite Scanner Animation
  calculateButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const scannerModal = shadow.querySelector(`#scannerModal-${containerId}`);
    const scannerStatus = shadow.querySelector(`#scannerStatusText-${containerId}`);
    const scannerSub = shadow.querySelector(`#scannerSubText-${containerId}`);
    const scannerProgress = shadow.querySelector(`#scannerProgressBar-${containerId}`);

    if (scannerModal) scannerModal.classList.add('visible');
    if (scannerProgress) scannerProgress.style.width = '25%';

    try {
      // Phase 1: Satellite search
      if (scannerStatus) scannerStatus.textContent = 'Localizando edificio y tejado vía satélite...';
      if (scannerSub) scannerSub.textContent = 'Analizando imágenes ortofoto de alta resolución';
      if (scannerProgress) scannerProgress.style.width = '45%';

      const fetchPromise = calculateSolarData();

      // Phase 2: Radiation and angle
      setTimeout(() => {
        if (scannerStatus) scannerStatus.textContent = 'Calculando radiación solar y sombras...';
        if (scannerSub) scannerSub.textContent = 'Consultando base de datos climática Google Solar & PVGIS';
        if (scannerProgress) scannerProgress.style.width = '75%';
      }, 700);

      solarData = await fetchPromise;

      // Phase 3: Financial proposal
      if (scannerStatus) scannerStatus.textContent = 'Generando informe y estimación de amortización...';
      if (scannerProgress) scannerProgress.style.width = '100%';

      if (solarData.orthophotoUrl) {
        try {
          await Promise.race([
            new Promise(res => {
              const img = new Image();
              img.onload = res;
              img.onerror = res;
              img.src = solarData.orthophotoUrl;
            }),
            new Promise(res => setTimeout(res, 6000))
          ]);
        } catch (_) {}
      }

      setTimeout(() => {
        if (scannerModal) scannerModal.classList.remove('visible');
        showStep('step2');

        shadow.getElementById(`summaryLoading-${containerId}`).style.display = 'none';
        shadow.getElementById(`summaryContent-${containerId}`).style.display = 'block';
        shadow.getElementById(`continueToContact-${containerId}`).style.display = 'block';

        updateSummaryDisplay(solarData);
      }, 400);

    } catch (error) {
      console.error('Error in calculate:', error);
      if (scannerModal) scannerModal.classList.remove('visible');
      alert(error.message || 'Error al calcular los datos solares. Por favor, revisa la ubicación.');
    }
  });

  // Step 2: Continue to contact form
  continueButton.addEventListener('click', () => {
    showStep('step3');
  });

  // Back buttons
  backToFormButton.addEventListener('click', () => {
    showStep('step1b');
    shadow.getElementById(`summaryLoading-${containerId}`).style.display = 'block';
    shadow.getElementById(`summaryContent-${containerId}`).style.display = 'none';
    shadow.getElementById(`continueToContact-${containerId}`).style.display = 'none';
  });

  backToSummaryButton.addEventListener('click', () => {
    showStep('step2');
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

      const locationInput = shadow.getElementById(`location-${containerId}`);
      const latitudeInput = shadow.getElementById(`latitude-${containerId}`);
      const longitudeInput = shadow.getElementById(`longitude-${containerId}`);
      const polygonInput = shadow.getElementById(`polygonCoordinates-${containerId}`);

      const data = {
        ...Object.fromEntries(formData),
        ...Object.fromEntries(contactData),
        location: locationInput && locationInput.value ? locationInput.value : undefined,
        latitude: latitudeInput && latitudeInput.value ? latitudeInput.value : undefined,
        longitude: longitudeInput && longitudeInput.value ? longitudeInput.value : undefined,
        polygonCoordinates: polygonInput && polygonInput.value ? polygonInput.value : undefined,
        averagePricePerKWh: averagePriceInput && averagePriceInput.value ? averagePriceInput.value : undefined,
        averagePriceCurrency: averagePriceCurrencyInput && averagePriceCurrencyInput.value ? averagePriceCurrencyInput.value : currentCountryInfo.currency,
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