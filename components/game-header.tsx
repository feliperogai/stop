import { Trophy, Users, Clock, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface GameHeaderProps {
  round: number
  playersCount: number
  timeLeft: number
  currentLetter: string
  isPlaying: boolean
}

export function GameHeader({ round, playersCount, timeLeft, currentLetter, isPlaying }: GameHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getTimerColor = () => {
    if (timeLeft <= 10) return "text-destructive border-destructive bg-destructive/10"
    if (timeLeft <= 30) return "text-[var(--game-orange)] border-[var(--game-orange)] bg-[var(--game-orange)]/10"
    return "text-primary border-primary bg-primary/10"
  }

  return (
    <div className="text-center mb-8">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-[var(--game-pink)] via-[var(--game-blue)] to-[var(--game-teal)] bg-clip-text text-transparent mb-4 text-balance">
        STOP!
      </h1>
      <p className="text-xl text-muted-foreground mb-8 text-pretty">O jogo de palavras mais divertido do Brasil</p>

      {/* Game Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="game-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-[var(--game-yellow)]" />
              <span className="font-semibold">Rodada</span>
            </div>
            <div className="text-2xl font-bold text-[var(--game-yellow)]">{round}</div>
          </CardContent>
        </Card>

        <Card className="game-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-[var(--game-blue)]" />
              <span className="font-semibold">Jogadores</span>
            </div>
            <div className="text-2xl font-bold text-[var(--game-blue)]">{playersCount}</div>
          </CardContent>
        </Card>

        <Card className="game-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[var(--game-teal)]" />
              <span className="font-semibold">Tempo</span>
            </div>
            <div
              className={`text-2xl font-bold rounded-full px-4 py-2 border-2 ${getTimerColor()} ${
                timeLeft <= 10 && isPlaying ? "animate-timer-warning" : ""
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </CardContent>
        </Card>

        <Card className="game-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold">Letra</span>
            </div>
            <div className="text-4xl font-bold text-primary animate-bounce-in">{currentLetter || "?"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
