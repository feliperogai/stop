"use client"

import { useState, useEffect } from "react"

// Desabilitar pré-renderização estática
export const dynamic = 'force-dynamic'
import { RoomManager } from "@/components/room-manager"
import { GameLobby } from "@/components/game-lobby"
import { LiveGame } from "@/components/live-game"
import { AnswerEvaluation } from "@/components/answer-evaluation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, Trophy, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getGame, getGameRoom } from "@/lib/api-client"
import { getUserSession, clearUserSession, updateUserSession } from "@/lib/session"

type GamePhase = 'room-selection' | 'lobby' | 'playing' | 'evaluation' | 'finished'

interface GameSession {
  roomCode: string
  playerName: string
  playerId: number
  gameId: number
  isHost: boolean
  currentRound: number
  currentLetter: string
  roundId: number
}

export default function StopGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('room-selection')
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  // Restaurar sessão do localStorage ao carregar a página
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = getUserSession()
        if (!session) {
          setIsRestoring(false)
          return
        }

        console.log("Sessão encontrada no localStorage:", session)

        if (session.gameId && session.roomCode) {
          await restoreActiveGame(session)
        } else {
          restoreBasicSession(session)
        }
      } catch (error) {
        console.error("Erro ao restaurar sessão:", error)
        clearUserSession()
      } finally {
        setIsRestoring(false)
      }
    }

    const restoreActiveGame = async (session: any) => {
      try {
        const game = await getGame(session.gameId)
        const room = await getGameRoom(session.roomCode)

        if (game && room) {
          console.log("Jogo e sala ainda existem, restaurando sessão...")
          
          setGameSession({
            roomCode: session.roomCode,
            playerName: session.playerName,
            playerId: session.playerId,
            gameId: session.gameId,
            isHost: session.isHost || false,
            currentRound: game.current_round || 1,
            currentLetter: '',
            roundId: 0
          })

          // Determinar fase do jogo
          if (game.status === 'waiting' || game.status === 'playing' || game.status === 'scoring') {
            setGamePhase('playing')
          } else if (game.status === 'finished') {
            setGamePhase('finished')
          } else {
            setGamePhase('lobby')
          }

          console.log("Sessão restaurada com sucesso!")
        } else {
          console.log("Jogo ou sala não existem mais, limpando sessão...")
          clearUserSession()
        }
      } catch (error) {
        console.error("Erro ao verificar jogo/sala:", error)
        clearUserSession()
      }
    }

    const restoreBasicSession = (session: any) => {
      setGameSession({
        roomCode: session.roomCode || '',
        playerName: session.playerName,
        playerId: session.playerId,
        gameId: 0,
        isHost: session.isHost || false,
        currentRound: 1,
        currentLetter: '',
        roundId: 0
      })
      setGamePhase('lobby')
    }

    restoreSession()
  }, [])



  const handleRoomJoined = (roomCode: string, playerName: string, isHost: boolean) => {
    const session = getUserSession()
    if (session) {
      const newSession = {
        ...session,
        roomCode,
        playerName,
        isHost
      }
      updateUserSession(newSession)
      
      setGameSession({
        roomCode,
        playerName,
        playerId: session.playerId,
        gameId: session.gameId || 0,
        isHost,
        currentRound: 1,
        currentLetter: '',
        roundId: 0
      })
    } else {
      // Fallback se não houver sessão
      const playerId = Math.floor(Math.random() * 1000000)
      const newSession = {
        playerId,
        playerName,
        sessionId: Math.random().toString(36).substring(2) + Date.now().toString(36),
        roomCode,
        isHost,
        createdAt: Date.now()
      }
      updateUserSession(newSession)
      
      setGameSession({
        roomCode,
        playerName,
        playerId,
        gameId: 0,
        isHost,
        currentRound: 1,
        currentLetter: '',
        roundId: 0
      })
    }
    setGamePhase('lobby')
  }

  const handleGameStart = (gameId: number) => {
    if (gameSession) {
      // Atualizar sessão no localStorage
      updateUserSession({ gameId })
      
      setGameSession(prev => prev ? { ...prev, gameId } : null)
      setGamePhase('playing')
    }
  }


  const handleEvaluationComplete = () => {
    if (gameSession) {
      setGameSession(prev => prev ? { 
        ...prev, 
        currentRound: prev.currentRound + 1 
      } : null)
      
      // Verificar se chegou ao fim das 5 rodadas
      if (gameSession.currentRound >= 5) {
        setGamePhase('finished')
      } else {
        setGamePhase('playing')
      }
    }
  }

  const handleBackToRoomSelection = () => {
    clearUserSession()
    setGamePhase('room-selection')
    setGameSession(null)
  }

  // Mostrar tela de carregamento enquanto restaura a sessão
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--game-teal)]" />
                <p>Restaurando sessão...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Verificando se você tem um jogo em andamento
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation - apenas em algumas fases */}
      {(gamePhase === 'lobby' || gamePhase === 'playing' || gamePhase === 'evaluation') && (
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToRoomSelection}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <div className="flex gap-2">
                <Link href="/history">
                  <Button variant="ghost" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    Histórico
                  </Button>
                </Link>
                <Button variant="ghost" size="sm">
                  <Trophy className="w-4 h-4 mr-2" />
                  Ranking
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renderizar componente baseado na fase do jogo */}
      {gamePhase === 'room-selection' && (
        <RoomManager onRoomJoined={handleRoomJoined} />
      )}

      {gamePhase === 'lobby' && gameSession && (
        <GameLobby
          roomCode={gameSession.roomCode}
          playerName={gameSession.playerName}
          isHost={gameSession.isHost}
          onGameStart={handleGameStart}
        />
      )}

      {gamePhase === 'playing' && gameSession && (
        <LiveGame
          gameId={gameSession.gameId}
          playerName={gameSession.playerName}
          playerId={gameSession.playerId}
          roomCode={gameSession.roomCode}
        />
      )}

      {gamePhase === 'evaluation' && gameSession && (
        <AnswerEvaluation
          gameId={gameSession.gameId}
          roundId={gameSession.roundId}
          playerId={gameSession.playerId}
          playerName={gameSession.playerName}
          currentLetter={gameSession.currentLetter}
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}

      {gamePhase === 'finished' && (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
          <div className="max-w-4xl mx-auto pt-20">
            <Card className="game-card">
              <CardHeader>
                <CardTitle className="text-center text-3xl">
                  Partida Finalizada!
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
                  <p className="text-lg text-muted-foreground">
                    Parabéns! Você completou todas as 5 rodadas.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Os dados da partida foram limpos automaticamente.
                  </p>
                  <Button
                    onClick={handleBackToRoomSelection}
                    size="lg"
                    className="bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80 text-white px-8 py-3 text-lg"
                  >
                    Jogar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
