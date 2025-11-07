
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Calculator, FileText, Download, CheckCircle, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PagamentoOnline from "../components/PagamentoOnline";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { jsPDF } from "jspdf";

// Utility function
function maskCPFCNPJ(value) {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
}

export default function Simulacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const { imovel, proprietario, itens } = location.state || {};

  const [parcelas, setParcelas] = useState("1");
  const [vencimento, setVencimento] = useState("");
  const [simulacao, setSimulacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [emitido, setEmitido] = useState(null);
  const [showPagamentoOnline, setShowPagamentoOnline] = useState(false);

  React.useEffect(() => {
    if (!itens || itens.length === 0) {
      navigate(createPageUrl("Home"));
      return;
    }

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 10);
    setVencimento(defaultDate.toISOString().split("T")[0]);
  }, [itens, navigate]);

  const calcularTotal = () => {
    if (!itens) return 0;
    return itens.reduce((sum, item) => sum + (item.valor || 0), 0);
  };

  const handleSimular = async () => {
    setLoading(true);
    setError("");
    setSimulacao(null);

    try {
      const { data } = await base44.functions.invoke('simularParcelamento', {
        identificacao: {
          inscricao: imovel?.inscricao,
          cci: imovel?.cci,
          ccp: imovel?.ccp,
        },
        itensSelecionados: itens.map((item) => item.id),
        opcoes: {
          parcelas: parseInt(parcelas),
          vencimento,
        },
      });

      console.log("Simulação recebida:", data);
      setSimulacao(data);
    } catch (err) {
      if (err.response?.status === 422 || err.response?.status === 400) {
        setError("Dados inválidos para simulação. Verifique os débitos selecionados.");
      } else if (err.response?.status === 504) {
        setError("Timeout na simulação. Tente com menos débitos.");
      } else if (err.response?.status === 429) {
        setError("Muitas requisições. Aguarde alguns segundos.");
      } else {
        setError(err.response?.data?.error || "Erro ao simular. Tente novamente.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarPagamento = async () => {
    if (!simulacao) return;

    setConfirmando(true);
    setError("");

    try {
      const { data } = await base44.functions.invoke('emitirDuam', {
        simulacao: simulacao,
        identificacao: {
          inscricao: imovel?.inscricao,
          cci: imovel?.cci,
          ccp: imovel?.ccp,
        },
        itensSelecionados: itens.map((item) => item.id),
        opcoes: {
          parcelas: parseInt(parcelas),
          vencimento,
        },
      });

      console.log("Boleto emitido:", data);
      setEmitido(data);
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Este parcelamento já foi efetivado anteriormente");
      } else if (err.response?.status === 404) {
        setError("DUAM não encontrado para emissão");
      } else if (err.response?.status === 422 || err.response?.status === 400) {
        setError(err.response?.data?.error || "Dados inválidos para emissão");
      } else {
        setError(err.response?.data?.error || "Erro ao confirmar pagamento. Tente novamente");
      }
      console.error(err);
    } finally {
      setConfirmando(false);
    }
  };

  const handlePagamentoOnlineSuccess = (resultado) => {
    setShowPagamentoOnline(false);
    setEmitido({
      sucesso: true,
      pagamento_online: true,
      pagamento_id: resultado.pagamento_id,
      duams: simulacao.duamsInclusos?.join(", ") || "N/D",
      totalParcelas: simulacao.parcelas?.length || 0,
      valorTotal: simulacao.totalGeral,
      mensagem: "Pagamento processado com sucesso!",
      instrucoes: [
        "Pagamento realizado via Mercado Pago",
        "Você receberá um e-mail de confirmação",
        "A baixa será processada em até 48h úteis",
        "Acompanhe o status na área de Pagamentos"
      ]
    });
  };

  const exportarCSV = () => {
    if (!simulacao?.parcelas) return;

    const csv = [
      ["Parcela", "Vencimento", "Valor", "Total"],
      ...simulacao.parcelas.map((p) => [
        p.numero,
        new Date(p.vencimento).toLocaleDateString("pt-BR"),
        `R$ ${p.valor.toFixed(2)}`,
        `R$ ${p.total ? p.total.toFixed(2) : p.valor.toFixed(2)}`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `simulacao_iptu_${new Date().getTime()}.csv`;
    link.click();
  };

  const gerarPDF = () => {
    if (!emitido) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setTextColor(255, 255, 255); // White
    doc.setFontSize(20);
    doc.text("IPTU Araguaína", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.text("Documento de Arrecadação Municipal", pageWidth / 2, 25, { align: "center" });

    // Reset color
    doc.setTextColor(0, 0, 0); // Black

    // Dados do Imóvel
    let y = 50;
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Dados do Imóvel", 20, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Endereço: ${imovel?.endereco || "N/D"}`, 20, y);

    y += 7;
    if (imovel?.inscricao) {
      doc.text(`Inscrição: ${imovel.inscricao}`, 20, y);
      y += 7;
    }
    if (imovel?.cci) {
      doc.text(`CCI: ${imovel.cci}`, 20, y);
      y += 7;
    }

    // Dados do Proprietário
    y += 5;
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Dados do Proprietário", 20, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Nome: ${proprietario?.nome || "N/D"}`, 20, y);

    y += 7;
    if (proprietario?.documento) {
      doc.text(`CPF/CNPJ: ${maskCPFCNPJ(proprietario.documento)}`, 20, y);
    }

    // Linha separadora
    y += 10;
    doc.setDrawColor(200, 200, 200); // Light gray
    doc.line(20, y, pageWidth - 20, y);

    // Informações do Boleto
    y += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Informações do Boleto", 20, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    if (emitido.duams) {
      doc.text(`DUAM(s): ${emitido.duams}`, 20, y);
      y += 7;
    }

    if (emitido.protocolo) {
      doc.text(`Protocolo: ${emitido.protocolo}`, 20, y);
      y += 7;
    }

    doc.text(`Total de Parcelas: ${emitido.totalParcelas}x`, 20, y);
    y += 7;

    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text(`Valor Total: R$ ${emitido.valorTotal?.toFixed(2) || "0.00"}`, 20, y);

    y += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (emitido.primeiroVencimento) {
      doc.text(
        `Primeiro Vencimento: ${new Date(emitido.primeiroVencimento).toLocaleDateString("pt-BR")}`,
        20,
        y
      );
      y += 7;
    }

    // Linha Digitável (se disponível)
    if (emitido.linhaDigitavel) {
      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);

      y += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Linha Digitável", 20, y);

      y += 8;
      doc.setFontSize(9);
      doc.setFont("courier", "normal"); // Use a monospaced font for line digitável

      // Quebra linha digitável em partes
      const linhaDigitavel = emitido.linhaDigitavel;
      const maxWidth = pageWidth - 40; // 20mm padding on each side
      const lines = doc.splitTextToSize(linhaDigitavel, maxWidth);

      lines.forEach((line) => {
        doc.text(line, 20, y);
        y += 6; // Line height for font size 9
      });
    }

    // Instruções
    y += 10;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Instruções de Pagamento:", 20, y);

    y += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    if (emitido.instrucoes && emitido.instrucoes.length > 0) {
      emitido.instrucoes.forEach((instrucao, idx) => {
        if (y > pageHeight - 30) { // Check if we need a new page
          doc.addPage();
          y = 20; // Reset y for new page
        }
        doc.text(`${idx + 1}. ${instrucao}`, 20, y);
        y += 6; // Line height
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128); // Gray
    const footerY = pageHeight - 15;
    doc.text("Prefeitura Municipal de Araguaína - TO", pageWidth / 2, footerY, { align: "center" });
    doc.text(
      `Documento gerado em: ${new Date().toLocaleString("pt-BR")}`,
      pageWidth / 2,
      footerY + 5,
      { align: "center" }
    );

    // Download
    doc.save(`boleto_iptu_${emitido.duams || new Date().getTime()}.pdf`);
  };

  if (!itens) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">
            Simulação de Parcelamento
          </h1>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info do Imóvel */}
          <Card className="border-t-4 border-t-blue-600 shadow-lg">
            <CardHeader>
              <CardTitle>Resumo da Seleção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-600">Proprietário</p>
                  <p className="font-semibold text-slate-800">
                    {proprietario?.nome || "N/D"}
                  </p>
                  {proprietario?.documento && (
                    <p className="text-sm text-slate-500">
                      {maskCPFCNPJ(proprietario.documento)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Endereço</p>
                  <p className="font-semibold text-slate-800">
                    {imovel?.endereco || "N/D"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-slate-600 mb-2">
                  Débitos Selecionados ({itens.length})
                </p>
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded"
                    >
                      <span className="text-slate-700">{item.descricao}</span>
                      <span className="font-semibold text-slate-800">
                        R$ {item.valor.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">
                      Total a Pagar
                    </span>
                    <span className="text-2xl font-bold text-slate-800">
                      R$ {calcularTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opções de Simulação */}
          {!simulacao && !emitido && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Opções de Parcelamento - Banco Real Prodata
                </CardTitle>
                <CardDescription>
                  Configure as opções e simule o parcelamento com dados reais do sistema (máximo 10 parcelas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parcelas">Número de Parcelas</Label>
                    <Select value={parcelas} onValueChange={setParcelas}>
                      <SelectTrigger id="parcelas">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vencimento">Data do Primeiro Vencimento</Label>
                    <Input
                      id="vencimento"
                      type="date"
                      value={vencimento}
                      onChange={(e) => setVencimento(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Informação:</strong> A simulação será feita diretamente no banco de dados
                    do Prodata com valores reais atualizados (juros, multas e correções). Parcelamento limitado a 10x conforme regras da prefeitura.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSimular}
                  disabled={loading || !vencimento}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Skeleton className="w-4 h-4 mr-2" />
                      Consultando Banco Real...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Simular Parcelamento Real
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resultado da Simulação */}
          {simulacao && !emitido && (
            <Card className="border-t-4 border-t-green-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Simulação Realizada - Banco Prodata
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={exportarCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
                <CardDescription>
                  Dados obtidos diretamente do banco de dados oficial
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Resumo da simulação */}
                {simulacao.resumo && (
                  <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-600">Parcelas</p>
                      <p className="text-lg font-bold text-slate-800">
                        {simulacao.resumo.quantidadeParcelas}x
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Média/Parcela</p>
                      <p className="text-lg font-bold text-slate-800">
                        R$ {simulacao.resumo.valorMedioParcela?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Total Juros</p>
                      <p className="text-lg font-bold text-orange-600">
                        R$ {simulacao.resumo.totalJuros?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Total Multa</p>
                      <p className="text-lg font-bold text-red-600">
                        R$ {simulacao.resumo.totalMulta?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {simulacao.parcelas?.map((parcela) => (
                    <div
                      key={parcela.numero}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          Parcela {parcela.numero}
                        </p>
                        <p className="text-sm text-slate-600">
                          Venc:{" "}
                          {new Date(parcela.vencimento).toLocaleDateString("pt-BR")}
                        </p>
                        {parcela.valorPrincipal && (
                          <p className="text-xs text-slate-500 mt-1">
                            Principal: R$ {parcela.valorPrincipal.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-800">
                          R$ {parcela.valor.toFixed(2)}
                        </p>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          {parcela.juros > 0 && (
                            <p>+ R$ {parcela.juros.toFixed(2)} juros</p>
                          )}
                          {parcela.multa > 0 && (
                            <p>+ R$ {parcela.multa.toFixed(2)} multa</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Total do Parcelamento
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    R$ {simulacao.totalGeral?.toFixed(2)}
                  </p>
                  {simulacao.dataSimulacao && (
                    <p className="text-xs text-blue-700 mt-2">
                      Simulado em: {new Date(simulacao.dataSimulacao).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSimulacao(null)}
                      className="flex-1"
                    >
                      Nova Simulação
                    </Button>
                    <Button
                      onClick={handleConfirmarPagamento}
                      disabled={confirmando}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      {confirmando ? (
                        <>
                          <Skeleton className="w-4 h-4 mr-2" />
                          Gerando Boleto...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Gerar Boleto
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Novo: Botão de Pagamento Online */}
                  <Button
                    onClick={() => setShowPagamentoOnline(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar Online Agora (PIX ou Cartão)
                  </Button>
                  
                  <p className="text-xs text-center text-slate-500">
                    💳 Pagamento seguro via Mercado Pago • Aprovação instantânea
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DUAM Emitido */}
          {emitido && (
            <Card className="border-t-4 border-t-green-600 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {emitido.pagamento_online ? "Pagamento Online Processado" : "Boleto Emitido com Sucesso - Prodata"}
                </CardTitle>
                <CardDescription>
                  {emitido.pagamento_online ? "O pagamento foi processado online." : "Boleto real gerado pelo sistema Prodata"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emitido.linhaDigitavel && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <p className="text-sm text-green-800 mb-2 font-semibold">
                      Linha Digitável do Boleto
                    </p>
                    <p className="font-mono text-lg font-semibold text-green-900 break-all">
                      {emitido.linhaDigitavel}
                    </p>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(emitido.linhaDigitavel);
                        alert("Linha digitável copiada!");
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      Copiar Linha Digitável
                    </Button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">{emitido.pagamento_online ? "Referência(s) DUAM" : "DUAM(s) Gerado(s)"}</p>
                    <p className="text-lg font-bold text-slate-800">{emitido.duams}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">Total de Parcelas</p>
                    <p className="text-lg font-bold text-slate-800">{emitido.totalParcelas}x</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">Valor Total</p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {emitido.valorTotal?.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">Primeiro Vencimento</p>
                    <p className="text-lg font-bold text-slate-800">
                      {emitido.primeiroVencimento
                        ? new Date(emitido.primeiroVencimento).toLocaleDateString("pt-BR")
                        : "N/D"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <Button
                    onClick={gerarPDF}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Boleto (PDF)
                  </Button>

                  {emitido.pdfUrl && (
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = emitido.pdfUrl;
                        link.download = `boleto_iptu_${emitido.duamPrincipal || new Date().getTime()}.pdf`;
                        link.click();
                      }}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Boleto Real (Prodata)
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="text-sm text-blue-900 font-semibold mb-3">
                    Instruções para Pagamento:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    {emitido.instrucoes?.map((instrucao, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{instrucao}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Novo: Link para acompanhar status */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                  <p className="text-sm text-yellow-900 font-semibold mb-2">
                    📊 Acompanhe o Status do Pagamento
                  </p>
                  <p className="text-sm text-yellow-800 mb-3">
                    Após realizar o pagamento, você pode consultar o status digitando seu CPF/CNPJ 
                    na página de Status de Pagamentos. A confirmação pode levar até 48h úteis.
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("StatusPagamentos"))}
                    variant="outline"
                    className="w-full border-yellow-300 text-yellow-900 hover:bg-yellow-100"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Ir para Status de Pagamentos
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Home"))}
                    className="flex-1"
                  >
                    Voltar ao Início
                  </Button>
                  {emitido.pdfUrl && (
                    <Button
                      onClick={() => window.open(emitido.pdfUrl, "_blank")}
                      variant="outline"
                      className="flex-1"
                    >
                      Visualizar Boleto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="max-w-4xl mx-auto mt-12 text-center text-sm text-slate-500">
          <p>Fonte: SIG Integração / Prefeitura de Araguaína</p>
        </div>
      </div>

      {/* Dialog de Pagamento Online */}
      <Dialog open={showPagamentoOnline} onOpenChange={setShowPagamentoOnline}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamento Online
            </DialogTitle>
            <DialogDescription>
              Conclua seu pagamento de forma rápida e segura via Mercado Pago (PIX ou Cartão de Crédito/Débito).
            </DialogDescription>
          </DialogHeader>
          <PagamentoOnline
            simulacao={simulacao}
            identificacao={{
              inscricao: imovel?.inscricao,
              cci: imovel?.cci,
              ccp: imovel?.ccp
            }}
            onClose={() => setShowPagamentoOnline(false)}
            onSuccess={handlePagamentoOnlineSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
