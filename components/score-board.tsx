import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award, Star } from "lucide-react"

interface Player {
  id: string
  name: string
  score: number
  answers: { [categoryId: string]: string }
}

interface ScoreBoardProps {
  players: Player[]
  currentRound: number
}

export function ScoreBoard({ players, currentRound }: ScoreBoardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="w-6 h-6 text-[var(--game-yellow)]" />
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <Star className="w-6 h-6 text-muted-foreground" />
    }
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 0:
        return "bg-gradient-to-r from-[var(--game-yellow)]/20 to-[var(--game-orange)]/20 border-[var(--game-yellow)]"
      case 1:
        return "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400 dark:from-gray-800 dark:to-gray-700"
      case 2:
        return "bg-gradient-to-r from-amber-100 to-amber-200 border-amber-600 dark:from-amber-900/20 dark:to-amber-800/20"
      default:
        return "bg-muted/50 border-border"
    }
  }

  return (
    <Card className="game-card">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[var(--game-yellow)]" />
          Placar - Rodada {currentRound}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${getPositionColor(index)}`}
            >
              <div className="flex items-center gap-4">
                {getPositionIcon(index)}
                <div>
                  <div className="font-semibold text-lg">{player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {Object.values(player.answers).filter(Boolean).length} respostas
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{player.score}</div>
                <div className="text-sm text-muted-foreground">pontos</div>
              </div>
            </div>
          ))}
        </div>

        {/* Game statistics */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[var(--game-pink)]">{currentRound}</div>
              <div className="text-sm text-muted-foreground">Rodadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--game-blue)]">{players.length}</div>
              <div className="text-sm text-muted-foreground">Jogadores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--game-teal)]">
                {Math.max(...players.map((p) => p.score))}
              </div>
              <div className="text-sm text-muted-foreground">Maior Pontuação</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--game-orange)]">
                {Math.round(players.reduce((acc, p) => acc + p.score, 0) / players.length)}
              </div>
              <div className="text-sm text-muted-foreground">Média</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
