"use client"

import { Button } from "@/components/ui/button"
import { Play, Pause, Square, RotateCcw, Plus, Minus } from "lucide-react"

interface TimerControlsProps {
  isRunning: boolean
  isPaused: boolean
  timeLeft: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onReset: () => void
  onAddTime?: (seconds: number) => void
  showTimeControls?: boolean
}

export function TimerControls({
  isRunning,
  isPaused,
  timeLeft,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onAddTime,
  showTimeControls = false,
}: TimerControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Main controls */}
      {!isRunning ? (
        <Button
          onClick={onStart}
          size="lg"
          className="bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80 text-white"
          disabled={timeLeft === 0}
        >
          <Play className="w-4 h-4 mr-2" />
          Iniciar
        </Button>
      ) : isPaused ? (
        <Button onClick={onResume} size="lg" variant="secondary">
          <Play className="w-4 h-4 mr-2" />
          Continuar
        </Button>
      ) : (
        <Button onClick={onPause} size="lg" variant="secondary">
          <Pause className="w-4 h-4 mr-2" />
          Pausar
        </Button>
      )}

      <Button onClick={onStop} size="lg" variant="destructive" disabled={!isRunning}>
        <Square className="w-4 h-4 mr-2" />
        Parar
      </Button>

      <Button onClick={onReset} size="lg" variant="outline">
        <RotateCcw className="w-4 h-4 mr-2" />
        Reiniciar
      </Button>

      {/* Time adjustment controls */}
      {showTimeControls && onAddTime && (
        <>
          <div className="w-px h-8 bg-border mx-2" />

          <Button
            onClick={() => onAddTime(30)}
            size="sm"
            variant="ghost"
            className="text-[var(--game-teal)]"
            disabled={isRunning && !isPaused}
          >
            <Plus className="w-4 h-4 mr-1" />
            30s
          </Button>

          <Button
            onClick={() => onAddTime(-30)}
            size="sm"
            variant="ghost"
            className="text-[var(--game-orange)]"
            disabled={(isRunning && !isPaused) || timeLeft <= 30}
          >
            <Minus className="w-4 h-4 mr-1" />
            30s
          </Button>
        </>
      )}
    </div>
  )
}
