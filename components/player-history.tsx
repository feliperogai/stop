"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Calendar, TrendingUp } from "lucide-react"
// Como os dados são temporários e limpos automaticamente, 
// este componente será simplificado para mostrar uma mensagem informativa

interface GameHistory {
  id: number
  game_id: number
  player_id: number
  player_name: string
  final_score: number
  final_position: number
  rounds_played: number
  completed_at: string
}

interface PlayerHistoryProps {
  playerId: string
  playerName: string
}

export function PlayerHistory({ playerId, playerName }: PlayerHistoryProps) {
  const [showRanking, setShowRanking] = useState(false)

  return (
    <div className="space-y-6">
      {/* Informação sobre dados temporários */}
      <Card className="game-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--game-blue)]" />
            Histórico de Partidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-[var(--game-yellow)] opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Dados Temporários</h3>
            <p className="text-muted-foreground mb-4">
              Este jogo foi projetado para ser completamente temporário. 
              Todas as partidas e dados são limpos automaticamente após o fim de cada jogo.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
              <p><strong>•</strong> Cada partida tem 10 rodadas</p>
              <p><strong>•</strong> Dados são limpos automaticamente após o fim</p>
              <p><strong>•</strong> Salas expiram em 2 horas</p>
              <p><strong>•</strong> Nenhum histórico permanente é mantido</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Foque no momento presente e divirta-se jogando!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ranking Global */}
      <Card className="game-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--game-yellow)]" />
            Ranking Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-[var(--game-teal)] opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Sem Ranking Permanente</h3>
            <p className="text-muted-foreground">
              Como os dados são temporários, não há ranking global permanente. 
              Cada partida é uma nova oportunidade de mostrar suas habilidades!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
