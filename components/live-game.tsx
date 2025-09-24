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
  getGameCategories,
  stopGameForAll
} from "@/lib/api-client"
import { toast } from "sonner"
import VotingScreen from "./voting-screen"

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
  const [showVoting, setShowVoting] = useState(false)
  const [stoppingGame, setStoppingGame] = useState(false)

  const fetchGameData = async () => {
    try {
      console.log("Buscando dados do jogo para gameId:", gameId)
      
      const [gameData, participantsData, categoriesData, currentRoundData, stats] = await Promise.all([
        getGame(gameId),
        getGameParticipants(gameId),
        getGameCategories(gameId),
        getCurrentRound(gameId),
        getGameStats(gameId)
      ])

      console.log("Dados recebidos:", {
        gameData,
        participantsData,
        categoriesData,
        currentRoundData,
        stats
      })

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
      
      console.log("Status do jogo:", gameData?.status)
      console.log("Jogador parou:", currentParticipant?.has_stopped)
      console.log("Categorias carregadas:", categoriesData.length)
      console.log("Categorias ordenadas:", categoriesData.sort((a, b) => a.position - b.position))
      console.log("Round atual:", currentRoundData)
      
      // Se o jogo está em scoring, ativar tela de votação
      if (gameData?.status === "scoring") {
        console.log("Jogo está em scoring, ativando tela de votação")
        setShowVoting(true)
      }

      // Se há uma rodada em status "waiting", iniciar automaticamente
      if (currentRoundData && currentRoundData.status === 'waiting') {
        console.log("Iniciando rodada em waiting:", currentRoundData.id)
        try {
          await startRound(currentRoundData.id)
          // Recarregar dados para pegar a rodada iniciada
          const updatedRoundData = await getCurrentRound(gameId)
          console.log("Rodada atualizada:", updatedRoundData)
          setCurrentRound(updatedRoundData)
          
          // Atualizar status do jogo também
          const updatedGameData = await getGame(gameId)
          console.log("Jogo atualizado:", updatedGameData)
          setGame(updatedGameData)
        } catch (error) {
          console.error("Erro ao iniciar rodada:", error)
        }
      }

      // Se o jogo está em status "waiting" mas há uma rodada ativa, atualizar status
      if (gameData && gameData.status === 'waiting' && currentRoundData && currentRoundData.status === 'playing') {
        console.log("Jogo deve estar em playing, mas está em waiting. Atualizando...")
        // Aqui poderíamos atualizar o status do jogo, mas por enquanto vamos apenas logar
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Erro ao buscar dados do jogo:", error)
      // Se houver erro de conexão, parar as tentativas
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.log("Servidor não está respondendo, parando tentativas...")
        setIsLoading(false)
        return
      }
      toast.error("Erro ao carregar dados do jogo")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGameData()
    const interval = setInterval(fetchGameData, 5000) // Atualiza a cada 5 segundos para reduzir carga
    return () => clearInterval(interval)
  }, [gameId, playerId])

  const handleAnswerChange = async (categoryId: string, value: string) => {
    if (!currentRound || hasStopped) return

    console.log("Salvando resposta:", { 
      roundId: currentRound.id, 
      playerId, 
      playerName, 
      categoryId: parseInt(categoryId), 
      answer: value 
    })

    setPlayerAnswers(prev => ({
      ...prev,
      [categoryId]: value
    }))

    try {
      const result = await savePlayerAnswer(currentRound.id, playerId, playerName, parseInt(categoryId), value)
      console.log("Resposta salva com sucesso:", result)
    } catch (error) {
      console.error("Erro ao salvar resposta:", error)
    }
  }


  const handleStopGameForAll = async () => {
    try {
      setStoppingGame(true)
      console.log("Parando jogo para todos os jogadores...")
      await stopGameForAll(gameId)
      console.log("Jogo parado com sucesso!")
      toast.success("Jogo interrompido para todos os jogadores!")
      
      console.log("Ativando tela de votação...")
      setShowVoting(true)
      console.log("showVoting definido como true")
    } catch (error) {
      console.error("Erro ao parar jogo:", error)
      toast.error("Erro ao parar jogo. Tente novamente.")
    } finally {
      setStoppingGame(false)
    }
  }

  const handleVotingComplete = () => {
    setShowVoting(false)
    // Aqui você pode navegar para a próxima rodada ou finalizar o jogo
    toast.success("Votação concluída!")
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

  // Mostrar tela de votação se necessário
  console.log("Verificando tela de votação:", { 
    showVoting, 
    currentRound: !!currentRound, 
    currentRoundId: currentRound?.id,
    gameStatus: game?.status,
    roundStatus: currentRound?.status
  })
  
  // Mostrar tela de votação se o jogo está em scoring OU se showVoting é true
  if ((showVoting || game?.status === "scoring") && currentRound) {
    console.log("Renderizando tela de votação para roundId:", currentRound.id)
    return (
      <VotingScreen
        gameId={gameId}
        roundId={currentRound.id}
        letter={currentRound.letter}
        onVotingComplete={handleVotingComplete}
      />
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
                  {categories.map((category, index) => {
                    console.log(`Renderizando categoria ${index + 1}:`, category.name, "ID:", category.id)
                    return (
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
                        disabled={hasStopped || !currentRound || currentRound.status !== "playing"}
                        className="category-input text-lg h-12"
                      />
                      {playerAnswers[category.id.toString()] && (
                        <div className="text-sm text-muted-foreground pl-2">
                          {playerAnswers[category.id.toString()].length} caracteres
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>

                {/* Botão de Controle */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  {/* Verificar se todos os campos estão preenchidos */}
                  {(() => {
                    const allFieldsFilled = categories.every(category => {
                      const answer = playerAnswers[category.id.toString()]
                      return answer && answer.trim().length > 0
                    })
                    
                    return (
                      <div>
                        <Button
                          onClick={handleStopGameForAll}
                          disabled={stoppingGame || game.status !== "playing" || !allFieldsFilled}
                          variant="outline"
                          size="lg"
                          className="px-8 py-3 text-lg border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {stoppingGame ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Parando...
                            </>
                          ) : (
                            <>
                              <Square className="w-5 h-5 mr-2" />
                              PARAR PARA TODOS
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          {allFieldsFilled 
                            ? "Interrompe o jogo para todos e inicia votação"
                            : "Preencha todos os campos para poder parar o jogo"
                          }
                        </p>
                      </div>
                    )
                  })()}
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
