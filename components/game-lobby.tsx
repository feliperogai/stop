"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Play, Copy, Check, RefreshCw, X } from "lucide-react"
import { getGameRoom, getGameParticipants, createGame, addGameParticipant, getRoomParticipants, updateRoomParticipantReady, removeRoomParticipant } from "@/lib/api-client"
import { getUserSession, updateUserSession, clearUserSession } from "@/lib/session"
import { toast } from "sonner"

interface GameLobbyProps {
  roomCode: string
  playerName: string
  isHost: boolean
  onGameStart: (gameId: number) => void
}

interface Participant {
  id: number
  player_name: string
  joined_at: string
  is_ready?: boolean
}

export function GameLobby({ roomCode, playerName, isHost, onGameStart }: GameLobbyProps) {
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [gameId, setGameId] = useState<number | null>(null)

  const fetchRoomData = async () => {
    try {
      const roomData = await getGameRoom(roomCode)
      if (roomData) {
        setRoom(roomData)
        
        // Buscar participantes da sala (antes da partida)
        const participantsData = await getRoomParticipants(roomData.id)
        
        // Converter para o formato esperado
        const formattedParticipants = participantsData.map(p => ({
          id: p.player_id,
          player_name: p.player_name,
          joined_at: p.joined_at,
          is_ready: p.is_ready || false
        }))
        
        setParticipants(formattedParticipants)
      }
    } catch (error) {
      console.error("Erro ao buscar dados da sala:", error)
    }
  }

  useEffect(() => {
    fetchRoomData()
    const interval = setInterval(fetchRoomData, 2000) // Atualiza a cada 2 segundos
    return () => clearInterval(interval)
  }, [roomCode])

  // Verificar se há uma partida ativa para redirecionar todos os usuários
  useEffect(() => {
    const checkForActiveGame = async () => {
      if (room) {
        try {
          // Verificar se há uma partida ativa para esta sala
          const roomData = await getGameRoom(roomCode)
          console.log("Verificando sala para redirecionamento:", roomData)
          
          console.log("Status da sala:", roomData?.status)
          console.log("Sala encontrada:", !!roomData)
          console.log("Game ID da sala:", roomData?.game_id)
          console.log("Game status da sala:", roomData?.game_status)
          
          // Verificar se há uma partida ativa (sala em playing OU scoring)
          if (roomData && (roomData.status === "playing" || roomData.status === "scoring")) {
            // Se a sala está em playing ou scoring, redirecionar para o jogo
            const session = getUserSession()
            console.log("Sessão do usuário:", session)
            
            // Usar gameId da sala se não tiver na sessão
            const gameIdToUse = session?.gameId || roomData.game_id
            
            if (gameIdToUse) {
              console.log("Redirecionando para o jogo:", gameIdToUse)
              onGameStart(gameIdToUse)
            } else {
              console.log("Usuário não tem gameId na sessão nem na sala")
            }
          } else {
            console.log("Sala não está em playing/scoring ou não encontrada")
            console.log("Status atual:", roomData?.status)
          }
        } catch (error) {
          console.error("Erro ao verificar partida ativa:", error)
        }
      }
    }

    checkForActiveGame()
  }, [room, roomCode, onGameStart])

  const handleToggleReady = async () => {
    if (!room) return
    
    const session = getUserSession()
    if (!session) return
    
    const currentParticipant = participants.find(p => p.player_name === playerName)
    if (!currentParticipant) {
      toast.error("Participante não encontrado. Recarregue a página.")
      return
    }
    
    try {
      const newReadyStatus = !currentParticipant.is_ready
      await updateRoomParticipantReady(room.id, session.playerId, newReadyStatus)
      
      // Atualizar estado local
      setParticipants(prev => 
        prev.map(p => 
          p.player_name === playerName 
            ? { ...p, is_ready: newReadyStatus }
            : p
        )
      )
      
      toast.success(newReadyStatus ? "Você está pronto!" : "Status de pronto removido")
    } catch (error) {
      console.error("Erro ao atualizar status de pronto:", error)
      toast.error("Erro ao atualizar status. Tente novamente.")
    }
  }

  const handleStartGame = async () => {
    if (!room || participants.length < 2) {
      toast.error("É necessário pelo menos 2 jogadores para começar")
      return
    }

    // Verificar se todos estão prontos
    const allReady = participants.every(p => p.is_ready)
    if (!allReady) {
      toast.error("Todos os jogadores devem estar prontos para começar")
      return
    }

    setIsStarting(true)
    try {
      console.log("Iniciando criação da partida para room:", room.id)
      
      // Criar a partida
      const game = await createGame(room.id)
      console.log("Partida criada:", game)
      
      if (!game) {
        throw new Error("Falha ao criar partida")
      }
      
      setGameId(game.id)

      // Adicionar todos os participantes à partida
      console.log("Adicionando participantes:", participants)
      for (const participant of participants) {
        const result = await addGameParticipant(game.id, participant.id, participant.player_name)
        console.log(`Participante ${participant.player_name} adicionado:`, result)
      }

      // Atualizar status da sala (será implementado na API)
      // await updateGameRoomStatus(room.id, "playing")

      // Salvar gameId na sessão
      updateUserSession({ gameId: game.id })
      console.log("GameId salvo na sessão:", game.id)

      toast.success("Partida iniciada!")
      onGameStart(game.id)
    } catch (error) {
      console.error("Erro ao iniciar partida:", error)
      toast.error("Erro ao iniciar partida. Tente novamente.")
    } finally {
      setIsStarting(false)
    }
  }

  const handleRemoveParticipant = async (participantId: number, participantName: string) => {
    if (!room || !isHost) return
    
    try {
      await removeRoomParticipant(room.id, participantId)
      
      // Atualizar estado local
      setParticipants(prev => prev.filter(p => p.id !== participantId))
      
      toast.success(`${participantName} foi removido da sala`)
    } catch (error) {
      console.error("Erro ao remover participante:", error)
      toast.error("Erro ao remover participante. Tente novamente.")
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Código da sala copiado!")
  }



  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--game-teal)]" />
                <p>Carregando sala...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-4xl mx-auto pt-20">
        {/* Header da Sala */}
        <Card className="game-card mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{room.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {roomCode}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRoomCode}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{room.current_players}/{room.max_players}</span>
                </div>
                <Badge 
                  variant={room.status === "waiting" ? "default" : "secondary"}
                  className="mt-1"
                >
                  {room.status === "waiting" ? "Aguardando" : "Em Andamento"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Participantes */}
        <Card className="game-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--game-pink)]" />
              Jogadores ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum jogador na sala ainda</p>
                <p className="text-sm">Compartilhe o código da sala para outros jogadores entrarem</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[var(--game-pink)] text-white">
                        {getPlayerInitials(participant.player_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{participant.player_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {participant.player_name === playerName ? "Você" : "Jogador"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.is_ready ? (
                        <Badge variant="default" className="text-xs bg-green-500">
                          Pronto
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Aguardando
                        </Badge>
                      )}
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Host
                        </Badge>
                      )}
                      {isHost && participant.player_name !== playerName && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id, participant.player_name)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controles */}
        <Card className="game-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isHost ? "Controles do Host" : "Status de Pronto"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isHost 
                    ? "Marque-se como pronto e inicie a partida quando todos estiverem prontos."
                    : "Marque-se como pronto quando estiver preparado para começar a partida."
                  }
                </p>
              </div>
              
              {/* Botão de Marcar como Pronto - para todos */}
              <Button
                onClick={handleToggleReady}
                className={`px-8 py-3 text-lg ${
                  participants.find(p => p.player_name === playerName)?.is_ready
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-[var(--game-teal)] hover:bg-[var(--game-teal)]/80 text-white"
                }`}
                size="lg"
              >
                {participants.find(p => p.player_name === playerName)?.is_ready ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Pronto!
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Marcar como Pronto
                  </>
                )}
              </Button>


              {/* Botão de Iniciar Partida - apenas para host */}
              {isHost && (
                <>
                  <Button
                    onClick={handleStartGame}
                    disabled={isStarting || participants.length < 2 || !participants.every(p => p.is_ready)}
                    className="bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80 text-white px-8 py-3 text-lg"
                    size="lg"
                  >
                    {isStarting ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Iniciar Partida
                      </>
                    )}
                  </Button>
                  
                  {participants.length < 2 && (
                    <p className="text-sm text-muted-foreground">
                      É necessário pelo menos 2 jogadores para começar
                    </p>
                  )}
                  
                  {participants.length >= 2 && !participants.every(p => p.is_ready) && (
                    <p className="text-sm text-muted-foreground">
                      Aguardando todos os jogadores ficarem prontos
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Regras do Jogo</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">5 rodadas</Badge>
                  <p>Cada partida tem 5 rodadas com letras diferentes</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">STOP Individual</Badge>
                  <p>Cada jogador pode parar quando quiser</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">Avaliação</Badge>
                  <p>Jogadores avaliam as respostas uns dos outros</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
