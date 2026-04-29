import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface FocalPointPickerProps {
  imageUrl: string
  focalX: number
  focalY: number
  onChange: (next: { focalX: number; focalY: number }) => void
  cropAspectRatio?: number
  label?: string
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  cropAspectRatio = 16 / 10,
  label = 'موضع الصورة (نقطة التركيز)',
}: FocalPointPickerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const updateFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLDivElement> | PointerEvent) => {
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100)
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100)
      onChange({ focalX: x, focalY: y })
    },
    [onChange],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    setDragging(true)
    updateFromEvent(event)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    updateFromEvent(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    ;(event.target as Element).releasePointerCapture?.(event.pointerId)
  }

  const x = clamp(focalX)
  const y = clamp(focalY)

  // Card crop window dimensions, computed in % of the full image area.
  // Without knowing the source image's natural ratio at the static pass we
  // approximate using the stage's rendered ratio: the crop is a horizontal
  // strip centered on (x,y) clipped to the stage. We render the rectangle
  // sized to cropAspectRatio relative to a square reference and clamp it.
  const cropPercent = computeCropRect(x, y, cropAspectRatio)

  return (
    <div className="focal-picker">
      <div className="focal-picker__label-row">
        <span className="focal-picker__label">{label}</span>
        <span className="focal-picker__readout">
          X: {Math.round(x)}% · Y: {Math.round(y)}%
        </span>
      </div>

      <div
        ref={stageRef}
        className={`focal-picker__stage${dragging ? ' focal-picker__stage--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imageUrl ? (
          <img
            className="focal-picker__image"
            src={imageUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="focal-picker__image-placeholder" />
        )}
        <div
          className="focal-picker__crop"
          style={{
            left: `${cropPercent.left}%`,
            top: `${cropPercent.top}%`,
            width: `${cropPercent.width}%`,
            height: `${cropPercent.height}%`,
          }}
        />
        <div
          className="focal-picker__dot"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>

      <div className="focal-picker__preview-row">
        <span className="focal-picker__preview-label">معاينة الكرت:</span>
        <div className="focal-picker__preview">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${x}% ${y}%`,
                display: 'block',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function computeCropRect(x: number, y: number, cropAspectRatio: number) {
  // Stage is the natural-aspect image. We approximate the card crop as a
  // viewport with cropAspectRatio shown relative to the stage's container.
  // The visualization assumes a stage rendered at ~16/10 (wide) — for taller
  // images the rectangle still indicates the centred slice that would be
  // shown after object-fit: cover. Width is clamped to 100%.
  const stageRatio = 16 / 10
  let widthPercent = 100
  let heightPercent = (stageRatio / cropAspectRatio) * 100
  if (heightPercent > 100) {
    heightPercent = 100
    widthPercent = (cropAspectRatio / stageRatio) * 100
  }
  const left = Math.max(0, Math.min(100 - widthPercent, x - widthPercent / 2))
  const top = Math.max(0, Math.min(100 - heightPercent, y - heightPercent / 2))
  return { left, top, width: widthPercent, height: heightPercent }
}
