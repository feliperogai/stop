"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Play, Copy, Check, RefreshCw } from "lucide-react"
import { getGameRoom, getGameParticipants, createGame, addGameParticipant } from "@/lib/api-client"
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
        
        // Se já existe uma partida, buscar participantes
        if (roomData.status === "playing" && gameId) {
          const participantsData = await getGameParticipants(gameId)
          setParticipants(participantsData)
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados da sala:", error)
    }
  }

  useEffect(() => {
    fetchRoomData()
    const interval = setInterval(fetchRoomData, 2000) // Atualiza a cada 2 segundos
    return () => clearInterval(interval)
  }, [roomCode, gameId])

  const handleStartGame = async () => {
    if (!room || participants.length < 2) {
      toast.error("É necessário pelo menos 2 jogadores para começar")
      return
    }

    setIsStarting(true)
    try {
      // Criar a partida
      const game = await createGame(room.id)
      setGameId(game.id)

      // Adicionar todos os participantes à partida
      for (const participant of participants) {
        await addGameParticipant(game.id, participant.id, participant.player_name)
      }

      // Atualizar status da sala (será implementado na API)
      // await updateGameRoomStatus(room.id, "playing")

      toast.success("Partida iniciada!")
      onGameStart(game.id)
    } catch (error) {
      console.error("Erro ao iniciar partida:", error)
      toast.error("Erro ao iniciar partida. Tente novamente.")
    } finally {
      setIsStarting(false)
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
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controles */}
        {isHost && (
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Controles do Host</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você é o host desta sala. Você pode iniciar a partida quando todos estiverem prontos.
                  </p>
                </div>
                
                <Button
                  onClick={handleStartGame}
                  disabled={isStarting || participants.length < 2}
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Regras do Jogo</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">10 Rodadas</Badge>
                  <p>Cada partida tem 10 rodadas com letras diferentes</p>
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
