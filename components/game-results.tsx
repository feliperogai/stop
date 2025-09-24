'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award, Star } from 'lucide-react'
import { getGameResults } from '@/lib/api-client'

interface GameResult {
  player_id: number
  player_name: string
  total_points: number
  total_answers: number
  valid_answers: number
  invalid_answers: number
}

interface GameResultsProps {
  gameId: number
  onNewGame?: () => void
}

export default function GameResults({ gameId, onNewGame }: GameResultsProps) {
  const [results, setResults] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [gameId])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const data = await getGameResults(gameId)
      setResults(data)
    } catch (error) {
      console.error('Erro ao buscar resultados:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <Star className="w-5 h-5 text-blue-500" />
    }
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-50 border-yellow-200'
      case 1:
        return 'bg-gray-50 border-gray-200'
      case 2:
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Calculando resultados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-4xl mx-auto pt-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            🏆 Resultados Finais
          </h1>
          <p className="text-muted-foreground text-lg">
            Jogo finalizado! Veja quem foi o grande vencedor!
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {results.map((player, index) => (
            <Card 
              key={player.player_id} 
              className={`p-6 ${getRankColor(index)} transition-all hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRankIcon(index)}
                    <span className="text-2xl font-bold text-foreground">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {player.player_name}
                    </h3>
                    <div className="flex space-x-4 text-sm text-muted-foreground">
                      <span>Respostas: {player.total_answers}</span>
                      <span>Válidas: {player.valid_answers}</span>
                      <span>Inválidas: {player.invalid_answers}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {player.total_points}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    pontos
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {results.length > 0 && (
          <div className="text-center">
            <Card className="p-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h2 className="text-3xl font-bold text-foreground">
                  🎉 Parabéns {results[0].player_name}!
                </h2>
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
              <p className="text-lg text-muted-foreground mb-6">
                Você foi o grande vencedor com <strong>{results[0].total_points} pontos</strong>!
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={onNewGame}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
                >
                  🎮 Novo Jogo
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="px-8 py-3"
                >
                  🏠 Voltar ao Início
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Obrigado por jogar! 🎊
          </p>
        </div>
      </div>
    </div>
  )
}
