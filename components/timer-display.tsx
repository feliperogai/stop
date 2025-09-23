import { Clock, AlertTriangle, Zap } from "lucide-react"

interface TimerDisplayProps {
  timeLeft: number
  isRunning: boolean
  isPaused: boolean
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export function TimerDisplay({ timeLeft, isRunning, isPaused, size = "md", showIcon = true }: TimerDisplayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getTimerStyles = () => {
    const baseStyles = "font-bold rounded-full border-2 transition-all duration-300"

    if (timeLeft <= 10) {
      return `${baseStyles} text-destructive border-destructive bg-destructive/10 ${
        isRunning ? "animate-timer-warning" : ""
      }`
    }

    if (timeLeft <= 30) {
      return `${baseStyles} text-[var(--game-orange)] border-[var(--game-orange)] bg-[var(--game-orange)]/10`
    }

    return `${baseStyles} text-primary border-primary bg-primary/10`
  }

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "text-lg px-3 py-1"
      case "lg":
        return "text-6xl px-8 py-4"
      default:
        return "text-2xl px-4 py-2"
    }
  }

  const getIcon = () => {
    if (!showIcon) return null

    if (timeLeft <= 10) {
      return <AlertTriangle className="w-5 h-5 text-destructive" />
    }

    if (timeLeft <= 30) {
      return <Zap className="w-5 h-5 text-[var(--game-orange)]" />
    }

    return <Clock className="w-5 h-5 text-primary" />
  }

  const getStatusText = () => {
    if (!isRunning) return "Parado"
    if (isPaused) return "Pausado"
    return "Em andamento"
  }

  return (
    <div className="text-center space-y-2">
      {showIcon && (
        <div className="flex items-center justify-center gap-2 mb-2">
          {getIcon()}
          <span className="font-semibold text-sm text-muted-foreground">{getStatusText()}</span>
        </div>
      )}

      <div className={`${getTimerStyles()} ${getSizeStyles()}`}>{formatTime(timeLeft)}</div>

      {size === "lg" && (
        <div className="text-sm text-muted-foreground">
          {timeLeft <= 10 ? "Tempo esgotando!" : timeLeft <= 30 ? "Atenção ao tempo!" : "Tempo restante"}
        </div>
      )}
    </div>
  )
}
