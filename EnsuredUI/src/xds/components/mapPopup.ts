import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'

// Dark basemap to match the application theme.
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'
export const MAP_STYLE_PREFLIGHT = 'https://api.mapbox.com/styles/v1/mapbox/dark-v11'

// Mapbox popups ship a hardcoded white content box + dark text, which is
// unreadable against our dark basemap. We tag each popup with this class and
// inject a themed override once per document so the text reads on the globe.
export const POPUP_CLASS = 'xds-map-popup'

let popupStyleInjected = false

export const ensurePopupStyles = () => {
  if (popupStyleInjected || typeof document === 'undefined') return
  popupStyleInjected = true
  const surface = colors.surfaceRaised
  const style = document.createElement('style')
  style.dataset.xdsMapPopup = 'true'
  style.textContent = `
    .${POPUP_CLASS} .mapboxgl-popup-content {
      background: ${surface};
      color: ${colors.text.primary};
      border: 1px solid ${colors.border};
      border-radius: ${radii.md}px;
      box-shadow: 0 6px 20px ${withAlpha(colors.black, 0.45)};
      font-size: 13px;
      line-height: 1.4;
      padding: 8px 12px;
    }
    .${POPUP_CLASS} .mapboxgl-popup-close-button {
      color: ${colors.onSurfaceVariant};
      font-size: 16px;
      padding: 0 6px;
    }
    .${POPUP_CLASS} .mapboxgl-popup-close-button:hover {
      background: transparent;
      color: ${colors.text.primary};
    }
    .${POPUP_CLASS}.mapboxgl-popup-anchor-top .mapboxgl-popup-tip,
    .${POPUP_CLASS}.mapboxgl-popup-anchor-top-left .mapboxgl-popup-tip,
    .${POPUP_CLASS}.mapboxgl-popup-anchor-top-right .mapboxgl-popup-tip {
      border-bottom-color: ${surface};
    }
    .${POPUP_CLASS}.mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip,
    .${POPUP_CLASS}.mapboxgl-popup-anchor-bottom-left .mapboxgl-popup-tip,
    .${POPUP_CLASS}.mapboxgl-popup-anchor-bottom-right .mapboxgl-popup-tip {
      border-top-color: ${surface};
    }
    .${POPUP_CLASS}.mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
      border-right-color: ${surface};
    }
    .${POPUP_CLASS}.mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
      border-left-color: ${surface};
    }
  `
  document.head.appendChild(style)
}
