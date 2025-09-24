"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Square, 
  Users, 
  Clock, 
  Trophy, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"
import { 
  getGame, 
  getGameParticipants, 
  getCurrentRound, 
  savePlayerAnswer,
  getRoundAnswers,
  updatePlayerStopStatus,
  checkAllPlayersStopped,
  getGameStats,
  endRound,
  createRound,
  startRound,
  getGameCategories
} from "@/lib/api-client"
import { toast } from "sonner"

interface LiveGameProps {
  gameId: number
  playerName: string
  playerId: number
  roomCode: string
}

interface Participant {
  id: number
  player_name: string
  total_score: number
  has_stopped: boolean
  stopped_at?: string
}

interface Category {
  id: number
  name: string
  position: number
}

interface PlayerAnswer {
  id: number
  category_id: number
  answer: string
  submitted_at: string
}

export function LiveGame({ gameId, playerName, playerId, roomCode }: LiveGameProps) {
  const [game, setGame] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [playerAnswers, setPlayerAnswers] = useState<{ [categoryId: string]: string }>({})
  const [hasStopped, setHasStopped] = useState(false)
  const [gameStats, setGameStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchGameData = async () => {
    try {
      const [gameData, participantsData, categoriesData, currentRoundData, stats] = await Promise.all([
        getGame(gameId),
        getGameParticipants(gameId),
        getGameCategories(gameId),
        getCurrentRound(gameId),
        getGameStats(gameId)
      ])

      setGame(gameData)
      setParticipants(participantsData)
      setCategories(categoriesData.sort((a, b) => a.position - b.position))
      setCurrentRound(currentRoundData)
      setGameStats(stats)

      // Verificar se o jogador atual já parou
      const currentParticipant = participantsData.find(p => p.id === playerId)
      if (currentParticipant) {
        setHasStopped(currentParticipant.has_stopped)
      }

      // Se há uma rodada em status "waiting", iniciar automaticamente
      if (currentRoundData && currentRoundData.status === 'waiting') {
        await startRound(currentRoundData.id)
        // Recarregar dados para pegar a rodada iniciada
        const updatedRoundData = await getCurrentRound(gameId)
        setCurrentRound(updatedRoundData)
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Erro ao buscar dados do jogo:", error)
      toast.error("Erro ao carregar dados do jogo")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGameData()
    const interval = setInterval(fetchGameData, 2000) // Atualiza a cada 2 segundos
    return () => clearInterval(interval)
  }, [gameId, playerId])

  const handleAnswerChange = async (categoryId: string, value: string) => {
    if (!currentRound || hasStopped) return

    setPlayerAnswers(prev => ({
      ...prev,
      [categoryId]: value
    }))

    try {
      await savePlayerAnswer(currentRound.id, playerId, parseInt(categoryId), value)
    } catch (error) {
      console.error("Erro ao salvar resposta:", error)
    }
  }

  const handleStop = async () => {
    if (hasStopped) return

    try {
      await updatePlayerStopStatus(gameId, playerId, true)
      setHasStopped(true)
      toast.success("Você parou! Aguarde os outros jogadores.")
      
      // Verificar se todos pararam
      const allStopped = await checkAllPlayersStopped(gameId)
      if (allStopped) {
        toast.info("Todos os jogadores pararam! Iniciando avaliação...")
        await endRound(currentRound.id)
        // Aqui você pode navegar para a tela de avaliação
      }
    } catch (error) {
      console.error("Erro ao parar:", error)
      toast.error("Erro ao parar. Tente novamente.")
    }
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getTimeLeft = () => {
    if (!currentRound?.start_time) return 0
    
    const startTime = new Date(currentRound.start_time).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)
    const timeLeft = Math.max(0, currentRound.duration - elapsed)
    
    return timeLeft
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--game-teal)]" />
                <p>Carregando partida...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!game || !currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-yellow-500" />
                <p>Partida não encontrada ou não iniciada</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header da Partida */}
        <Card className="game-card mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Rodada {game.current_round} de {game.max_rounds}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    Sala: {roomCode}
                  </Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Letra: {currentRound.letter}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-2xl font-mono">{getTimeLeft()}s</span>
                </div>
                <Badge 
                  variant={game.status === "playing" ? "default" : "secondary"}
                >
                  {game.status === "playing" ? "Em Andamento" : "Aguardando"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Área de Respostas */}
          <div className="lg:col-span-2">
            <Card className="game-card mb-6">
              <CardHeader>
                <CardTitle className="text-center">
                  Palavras com a letra{" "}
                  <span className="text-primary text-4xl bg-primary/10 px-4 py-2 rounded-full border-2 border-primary">
                    {currentRound.letter}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[var(--game-pink)] shadow-lg" />
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {category.position}
                        </Badge>
                        <Label className="font-semibold text-lg">{category.name}</Label>
                      </div>
                      <Input
                        placeholder={`${category.name} com ${currentRound.letter}...`}
                        value={playerAnswers[category.id.toString()] || ""}
                        onChange={(e) => handleAnswerChange(category.id.toString(), e.target.value)}
                        disabled={hasStopped || game.status !== "playing"}
                        className="category-input text-lg h-12"
                      />
                      {playerAnswers[category.id.toString()] && (
                        <div className="text-sm text-muted-foreground pl-2">
                          {playerAnswers[category.id.toString()].length} caracteres
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botão STOP */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <Button
                    onClick={handleStop}
                    disabled={hasStopped || game.status !== "playing"}
                    variant={hasStopped ? "secondary" : "destructive"}
                    size="lg"
                    className="px-8 py-3 text-lg"
                  >
                    {hasStopped ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Você Parou!
                      </>
                    ) : (
                      <>
                        <Square className="w-5 h-5 mr-2" />
                        PARAR
                      </>
                    )}
                  </Button>
                  {hasStopped && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Aguarde os outros jogadores terminarem
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Painel de Jogadores */}
          <div>
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--game-teal)]" />
                  Jogadores ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        participant.id === playerId ? 'bg-[var(--game-pink)]/10 border-[var(--game-pink)]' : 'bg-card'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[var(--game-pink)] text-white">
                          {getPlayerInitials(participant.player_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{participant.player_name}</p>
                          {participant.id === playerId && (
                            <Badge variant="secondary" className="text-xs">Você</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          <span className="text-sm">{participant.total_score} pts</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {participant.has_stopped ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Estatísticas */}
                {gameStats && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold mb-3">Status da Rodada</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Jogadores:</span>
                        <span>{gameStats.totalPlayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pararam:</span>
                        <span>{gameStats.stoppedPlayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="outline" className="text-xs">
                          {gameStats.gameStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
