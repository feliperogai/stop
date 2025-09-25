"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, ArrowRight, Copy, Check } from "lucide-react"
import { createGameRoom, joinGameRoom, getGameRoom, createPlayer, getPlayerBySessionId, addRoomParticipant } from "@/lib/api-client"
import { saveUserSession, getUserSession, generateSessionId, updateUserSession, clearUserSession } from "@/lib/session"
import { toast } from "sonner"

interface RoomManagerProps {
  onRoomJoined: (roomCode: string, playerName: string, isHost: boolean) => void
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [roomName, setRoomName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  // Verificar se há sessão existente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingSession = getUserSession()
      if (existingSession) {
        setPlayerName(existingSession.playerName)
        
        // Se tem sala, redirecionar automaticamente
        if (existingSession.roomCode) {
          handleRejoinRoom(existingSession)
        }
      }
    }
  }, [])

  const handleRejoinRoom = async (session: any) => {
    try {
      // Verificar se a sala ainda existe
      const room = await getGameRoom(session.roomCode)
      if (room && room.status === "waiting") {
        toast.success(`Reconectando à sala ${session.roomCode}...`)
        onRoomJoined(session.roomCode, session.playerName, session.isHost || false)
      } else {
        // Sala não existe mais, limpar sessão
        clearUserSession()
        toast.info("Sala não encontrada. Criando nova sessão.")
      }
    } catch (error) {
      console.error("Erro ao reconectar:", error)
      clearUserSession()
    }
  }

  const handleCreateRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) {
      toast.error("Por favor, preencha seu nome e o nome da sala")
      return
    }

    setIsCreating(true)
    try {
      // Verificar se já existe sessão
      let existingSession = getUserSession()
      let sessionId: string
      let playerId: number

      if (existingSession) {
        sessionId = existingSession.sessionId
        playerId = existingSession.playerId
      } else {
        sessionId = generateSessionId()
        const player = await createPlayer(playerName, sessionId)
        playerId = player.id
      }

      const room = await createGameRoom(roomName, sessionId)
      
      // Adicionar o criador da sala como participante
      await addRoomParticipant(room.id, playerId, playerName)
      
      // Salvar sessão
      saveUserSession({
        playerId,
        playerName,
        sessionId,
        roomCode: room.room_code,
        isHost: true,
        createdAt: Date.now()
      })
      
      toast.success(`Sala "${room.room_code}" criada com sucesso!`)
      onRoomJoined(room.room_code, playerName, true)
    } catch (error) {
      console.error("Erro ao criar sala:", error)
      toast.error("Erro ao criar sala. Tente novamente.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast.error("Por favor, preencha seu nome e o código da sala")
      return
    }

    setIsJoining(true)
    try {
      const room = await getGameRoom(roomCode.toUpperCase())
      if (!room) {
        toast.error("Sala não encontrada. Verifique o código.")
        return
      }

      if (room.current_players >= room.max_players) {
        toast.error("Sala cheia. Tente outra sala.")
        return
      }

      if (room.status !== "waiting") {
        toast.error("Esta sala já está em andamento.")
        return
      }

      // Verificar se já existe sessão
      let existingSession = getUserSession()
      let sessionId: string
      let playerId: number

      if (existingSession) {
        sessionId = existingSession.sessionId
        playerId = existingSession.playerId
      } else {
        sessionId = generateSessionId()
        const player = await createPlayer(playerName, sessionId)
        playerId = player.id
      }
      
      await joinGameRoom(roomCode.toUpperCase(), playerId, playerName)
      
      // Salvar sessão
      saveUserSession({
        playerId,
        playerName,
        sessionId,
        roomCode: roomCode.toUpperCase(),
        isHost: false,
        createdAt: Date.now()
      })
      
      toast.success(`Entrou na sala "${roomCode.toUpperCase()}"!`)
      onRoomJoined(roomCode.toUpperCase(), playerName, false)
    } catch (error) {
      console.error("Erro ao entrar na sala:", error)
      toast.error("Erro ao entrar na sala. Tente novamente.")
    } finally {
      setIsJoining(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-2xl mx-auto pt-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Stop Game
          </h1>
          <p className="text-muted-foreground text-lg">
            Crie ou entre em uma sala para começar a jogar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Criar Sala */}
          <Card className="game-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--game-pink)]" />
                Criar Nova Sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-player-name">Seu Nome</Label>
                <Input
                  id="create-player-name"
                  placeholder="Digite seu nome"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-name">Nome da Sala</Label>
                <Input
                  id="room-name"
                  placeholder="Ex: Sala da Família"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={30}
                />
              </div>

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || !playerName.trim() || !roomName.trim()}
                className="w-full bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80"
                size="lg"
              >
                {isCreating ? "Criando..." : "Criar Sala"}
              </Button>
            </CardContent>
          </Card>

          {/* Entrar em Sala */}
          <Card className="game-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-[var(--game-teal)]" />
                Entrar em Sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-player-name">Seu Nome</Label>
                <Input
                  id="join-player-name"
                  placeholder="Digite seu nome"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-code">Código da Sala</Label>
                <Input
                  id="room-code"
                  placeholder="Ex: ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                disabled={isJoining || !playerName.trim() || !roomCode.trim()}
                className="w-full bg-[var(--game-teal)] hover:bg-[var(--game-teal)]/80"
                size="lg"
              >
                {isJoining ? "Entrando..." : "Entrar na Sala"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Como funciona?</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">1</Badge>
                  <p>Crie uma sala ou entre com um código</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">2</Badge>
                  <p>Jogue 5 rodadas com diferentes letras</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">3</Badge>
                  <p>Avalie as respostas e veja quem ganha!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
