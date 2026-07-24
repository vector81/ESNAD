import { useEffect, useRef } from 'react'
import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

const COUNTRIES_DATA_URL = '/data/countries.json'

// Natural Earth 110m country names (some small states don't exist at this scale).
const DEFAULT_RED_COUNTRIES = [
  'Algeria',
  'Bahrain',
  'Comoros',
  'Djibouti',
  'Egypt',
  'Iraq',
  'Jordan',
  'Kuwait',
  'Lebanon',
  'Libya',
  'Mauritania',
  'Morocco',
  'Oman',
  'Palestine',
  'Qatar',
  'Saudi Arabia',
  'Somalia',
  'Sudan',
  'Syria',
  'Tunisia',
  'United Arab Emirates',
  'Yemen',
]

const DEFAULT_BLUE_COUNTRIES = [
  'United States of America',
  'United Kingdom',
  'France',
  'Germany',
  'China',
  'Turkey',
  'Türkiye',
  'India',
  'Japan',
  'Canada',
  'Australia',
  'Brazil',
  'Indonesia',
  'Malaysia',
]

// Start the view centred roughly on the Arab world.
const BASE_ROTATION: [number, number] = [-30, -15]

type CountryFeature = Feature<Polygon | MultiPolygon, { name?: string }>

function cssColor(token: string, fallback: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback
  )
}

interface WireframeDottedGlobeProps {
  size?: number
  className?: string
  spinDurationMs?: number
  ariaLabel?: string
  redCountries?: string[]
  blueCountries?: string[]
}

export default function WireframeDottedGlobe({
  size = 144,
  className = '',
  spinDurationMs = 1400,
  ariaLabel = 'Globe',
  redCountries = DEFAULT_RED_COUNTRIES,
  blueCountries = DEFAULT_BLUE_COUNTRIES,
}: WireframeDottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const redFill = cssColor('--accent', '#E63946')
    const blueFill = cssColor('--blue-light', '#5BA3E6')
    const inkFill = cssColor('--text', '#222222')
    const outlineColor = 'rgba(17, 17, 17, 0.45)'
    const graticuleColor = 'rgba(17, 17, 17, 0.12)'
    const edgeColor = 'rgba(17, 17, 17, 0.2)'

    const redSet = new Set(redCountries.map((name) => name.toLowerCase()))
    const blueSet = new Set(blueCountries.map((name) => name.toLowerCase()))

    let displaySize = size
    let radius = (size - 4) / 2
    const projection = geoOrthographic().clipAngle(90)
    const path = geoPath(projection, context)
    const graticule = geoGraticule()()

    let redFeatures: CountryFeature[] = []
    let blueFeatures: CountryFeature[] = []
    let plainFeatures: CountryFeature[] = []
    let allFeatures: CountryFeature[] = []
    const rotation: [number, number] = [BASE_ROTATION[0], BASE_ROTATION[1]]
    let frame: number | null = null
    let disposed = false

    // Match the canvas buffer to the exact on-screen device pixels; any
    // mismatch makes the browser resample the disc edge and it looks jagged.
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      displaySize = Math.max(24, Math.round(rect.width || size))
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(displaySize * dpr)
      canvas.height = Math.round(displaySize * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      radius = (displaySize - 4) / 2
      projection.scale(radius).translate([displaySize / 2, displaySize / 2])
    }

    const strokeFeatures = (features: CountryFeature[], style: string, width: number) => {
      context.beginPath()
      features.forEach((feature) => {
        path(feature)
      })
      context.strokeStyle = style
      context.lineWidth = width
      context.stroke()
    }

    const fillFeatures = (features: CountryFeature[], style: string) => {
      context.beginPath()
      features.forEach((feature) => {
        path(feature)
      })
      context.fillStyle = style
      context.fill()
    }

    const render = () => {
      context.clearRect(0, 0, displaySize, displaySize)

      context.beginPath()
      context.arc(displaySize / 2, displaySize / 2, radius, 0, 2 * Math.PI)
      context.fillStyle = '#ffffff'
      context.fill()
      context.strokeStyle = edgeColor
      context.lineWidth = 1
      context.stroke()

      context.beginPath()
      path(graticule)
      context.strokeStyle = graticuleColor
      context.lineWidth = 0.75
      context.stroke()

      if (allFeatures.length > 0) {
        fillFeatures(plainFeatures, inkFill)
        fillFeatures(redFeatures, redFill)
        fillFeatures(blueFeatures, blueFill)
        strokeFeatures(allFeatures, outlineColor, 0.6)
      }
    }

    const applyRotation = () => {
      projection.rotate([rotation[0], rotation[1]])
      render()
    }

    const spin = () => {
      if (frame !== null) return
      const startLambda = rotation[0]
      const start = performance.now()
      const step = (now: number) => {
        if (disposed) return
        const t = Math.min(1, (now - start) / spinDurationMs)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
        rotation[0] = startLambda + 360 * eased
        if (t < 1) {
          applyRotation()
          frame = requestAnimationFrame(step)
        } else {
          frame = null
          rotation[0] = startLambda
          applyRotation()
        }
      }
      frame = requestAnimationFrame(step)
    }

    let dragPointer: number | null = null
    let dragMoved = false
    let dragStartX = 0
    let dragStartY = 0
    let dragStartRotation: [number, number] = [0, 0]

    const handlePointerDown = (event: PointerEvent) => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      dragPointer = event.pointerId
      dragMoved = false
      dragStartX = event.clientX
      dragStartY = event.clientY
      dragStartRotation = [rotation[0], rotation[1]]
      canvas.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (dragPointer !== event.pointerId) return
      const dx = event.clientX - dragStartX
      const dy = event.clientY - dragStartY
      if (!dragMoved && Math.hypot(dx, dy) < 4) return
      dragMoved = true
      const sensitivity = 180 / displaySize
      rotation[0] = dragStartRotation[0] + dx * sensitivity
      rotation[1] = Math.max(-90, Math.min(90, dragStartRotation[1] - dy * sensitivity))
      applyRotation()
    }

    const handlePointerEnd = (event: PointerEvent) => {
      if (dragPointer !== event.pointerId) return
      dragPointer = null
    }

    const preventNativeDrag = (event: DragEvent) => {
      // The canvas may sit inside the header home link, which is natively
      // draggable and would hijack pointer drags.
      event.preventDefault()
    }

    const handleClick = (event: MouseEvent) => {
      // May sit inside the header home link: spin without navigating.
      event.preventDefault()
      event.stopPropagation()
      if (dragMoved) {
        dragMoved = false
        return
      }
      spin()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerEnd)
    canvas.addEventListener('pointercancel', handlePointerEnd)
    canvas.addEventListener('dragstart', preventNativeDrag)
    canvas.addEventListener('click', handleClick)

    setupCanvas()
    applyRotation()

    const observer = new ResizeObserver(() => {
      setupCanvas()
      applyRotation()
    })
    observer.observe(canvas)

    fetch(COUNTRIES_DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<FeatureCollection>
      })
      .then((countries) => {
        if (disposed) return
        allFeatures = countries.features.filter(
          (feature): feature is CountryFeature =>
            feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'
        )
        const colorOf = (feature: CountryFeature) => {
          const name = (feature.properties?.name ?? '').toLowerCase()
          if (redSet.has(name)) return 'red'
          if (blueSet.has(name)) return 'blue'
          return null
        }
        redFeatures = allFeatures.filter((feature) => colorOf(feature) === 'red')
        blueFeatures = allFeatures.filter((feature) => colorOf(feature) === 'blue')
        plainFeatures = allFeatures.filter((feature) => colorOf(feature) === null)
        render()
      })
      .catch((error) => {
        console.error('Failed to load globe country data', error)
      })

    return () => {
      disposed = true
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerEnd)
      canvas.removeEventListener('pointercancel', handlePointerEnd)
      canvas.removeEventListener('dragstart', preventNativeDrag)
      canvas.removeEventListener('click', handleClick)
      context.setTransform(1, 0, 0, 1, 0, 0)
    }
  }, [size, spinDurationMs, redCountries, blueCountries])

  return (
    <span
      className={`wireframe-globe${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <canvas ref={canvasRef} className="wireframe-globe__canvas" />
    </span>
  )
}
