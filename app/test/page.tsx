
import Script from "next/script";


export default function Test() {
    return (
        <>
            <div className="elementor-element elementor-element-53bed2f elementor-mobile-align-justify elementor-widget-mobile__width-initial elementor-widget elementor-widget-button" data-id="53bed2f" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
                <div className="elementor-widget-container">
                    <div className="elementor-button-wrapper">
                        <a className="elementor-button elementor-button-link elementor-size-sm" href="https://cal.com/wattify-es/15min" target="_blank">
                            <span className="elementor-button-content-wrapper">
                                <span className="elementor-button-text">Agenda tu reunión</span>
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            <Script src="/embed.js" defer></Script>
        </>
    )
}
