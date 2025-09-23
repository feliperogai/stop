"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Star, AlertCircle, CheckCircle, X, Award } from "lucide-react"
import { type RoundResult, getScoreBreakdown } from "@/lib/scoring"

interface ScoringModalProps {
  isOpen: boolean
  onClose: () => void
  results: RoundResult[]
  categories: { id: string; name: string; color: string }[]
  currentLetter: string
  onNextRound: () => void
}

export function ScoringModal({ isOpen, onClose, results, categories, currentLetter, onNextRound }: ScoringModalProps) {
  const sortedResults = [...results].sort((a, b) => b.finalScore - a.finalScore)

  const getAnswerIcon = (answer: any) => {
    if (!answer.answer.trim()) {
      return <X className="w-4 h-4 text-muted-foreground" />
    }
    if (!answer.isValid) {
      return <AlertCircle className="w-4 h-4 text-destructive" />
    }
    if (answer.points === 10) {
      return <Star className="w-4 h-4 text-[var(--game-yellow)]" />
    }
    return <CheckCircle className="w-4 h-4 text-[var(--game-teal)]" />
  }

  const getAnswerColor = (answer: any) => {
    if (!answer.answer.trim()) return "text-muted-foreground"
    if (!answer.isValid) return "text-destructive"
    if (answer.points === 10) return "text-[var(--game-yellow)]"
    return "text-[var(--game-teal)]"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-[var(--game-yellow)]" />
            Resultado da Rodada - Letra {currentLetter}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classificação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedResults.map((result, index) => {
                  const breakdown = getScoreBreakdown(result, categories)
                  return (
                    <div
                      key={result.playerId}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        index === 0
                          ? "bg-gradient-to-r from-[var(--game-yellow)]/20 to-[var(--game-orange)]/20 border-[var(--game-yellow)]"
                          : "bg-muted/50 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Trophy className="w-5 h-5 text-[var(--game-yellow)]" />}
                          <Badge variant="secondary">#{index + 1}</Badge>
                        </div>
                        <div>
                          <div className="font-semibold">Jogador {result.playerId}</div>
                          <div className="text-sm text-muted-foreground">{breakdown.completionRate}% completo</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{result.finalScore}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.totalPoints} + {result.bonusPoints} bônus
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes das respostas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Respostas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map((category) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-4 h-4 rounded-full ${category.color}`} />
                      <h4 className="font-semibold">{category.name}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.map((result) => {
                        const answer = result.answers.find((a) => a.categoryId === category.id)
                        return (
                          <div
                            key={result.playerId}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              {getAnswerIcon(answer)}
                              <span className="font-medium">Jogador {result.playerId}:</span>
                              <span className={getAnswerColor(answer)}>{answer?.answer || "Sem resposta"}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {answer?.points || 0} pts
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Legenda de pontuação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sistema de Pontuação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[var(--game-yellow)]" />
                  <span>Resposta única: 10 pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--game-teal)]" />
                  <span>Resposta duplicada: 5 pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span>Resposta inválida: 0 pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[var(--game-orange)]" />
                  <span>Bônus completo: +5 pts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={onNextRound}
              size="lg"
              className="bg-[var(--game-pink)] hover:bg-[var(--game-pink)]/80 text-white"
            >
              Próxima Rodada
            </Button>
            <Button onClick={onClose} size="lg" variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
