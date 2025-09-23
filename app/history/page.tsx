"use client"

import { useState } from "react"
import { PlayerHistory } from "@/components/player-history"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User } from "lucide-react"
import Link from "next/link"

export default function HistoryPage() {
  const [playerId, setPlayerId] = useState("1") // Simulando jogador logado
  const [playerName, setPlayerName] = useState("Jogador 1")
  const [showNameInput, setShowNameInput] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Jogo
            </Button>
          </Link>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--game-pink)] via-[var(--game-blue)] to-[var(--game-teal)] bg-clip-text text-transparent">
            Histórico & Ranking
          </h1>

          <Button onClick={() => setShowNameInput(!showNameInput)} variant="outline" size="sm">
            <User className="w-4 h-4 mr-2" />
            Trocar Jogador
          </Button>
        </div>

        {/* Input para trocar jogador */}
        {showNameInput && (
          <Card className="game-card mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Identificação do Jogador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Nome do jogador"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    setPlayerId(Date.now().toString())
                    setShowNameInput(false)
                  }}
                  disabled={!playerName.trim()}
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Componente de histórico */}
        <PlayerHistory playerId={playerId} playerName={playerName} />
      </div>
    </div>
  )
}
