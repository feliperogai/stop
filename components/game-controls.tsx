"use client"

import { Button } from "@/components/ui/button"
import { Play, Pause, Square, RotateCcw, Settings } from "lucide-react"

interface GameControlsProps {
  isPlaying: boolean
  isPaused: boolean
  onStart: () => void
  onPause: () => void
  onStop: () => void
  onReset: () => void
}

export function GameControls({ isPlaying, isPaused, onStart, onPause, onStop, onReset }: GameControlsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-8">
      {!isPlaying ? (
        <Button
          onClick={onStart}
          size="lg"
          className="bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80 text-white px-8 py-3 text-lg animate-pulse-glow"
        >
          <Play className="w-5 h-5 mr-2" />
          Iniciar Jogo
        </Button>
      ) : (
        <Button onClick={onPause} size="lg" variant="secondary" className="px-8 py-3 text-lg">
          <Pause className="w-5 h-5 mr-2" />
          {isPaused ? "Continuar" : "Pausar"}
        </Button>
      )}

      <Button onClick={onStop} size="lg" variant="destructive" className="px-8 py-3 text-lg">
        <Square className="w-4 h-4 mr-2" />
        Parar
      </Button>

      <Button onClick={onReset} size="lg" variant="outline" className="px-8 py-3 text-lg bg-transparent">
        <RotateCcw className="w-5 h-5 mr-2" />
        Reiniciar
      </Button>

      <Button size="lg" variant="ghost" className="px-8 py-3 text-lg">
        <Settings className="w-5 h-5 mr-2" />
        Configurações
      </Button>
    </div>
  )
}
