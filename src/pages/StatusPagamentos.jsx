
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle, Clock, AlertTriangle, TrendingUp, FileText, Building2, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

// Utility functions
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

function validateCPF(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(cpf.charAt(10));
}

function validateCNPJ(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

function validateCPFCNPJ(value) {
  if (!value) return false;
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 11) return validateCPF(numbers);
  if (numbers.length === 14) return validateCNPJ(numbers);
  return false;
}

export default function StatusPagamentos() {
  const navigate = useNavigate();
  const [documento, setDocumento] = useState("");
  const [pagamentos, setPagamentos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDocumentoChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setDocumento(maskCPFCNPJ(value));
    setError("");
  };

  const handleBuscar = async () => {
    const cleanDoc = documento.replace(/\D/g, "");
    
    if (!validateCPFCNPJ(cleanDoc)) {
      setError("CPF ou CNPJ inválido");
      return;
    }

    setLoading(true);
    setError("");
    setPagamentos(null);

    try {
      const { data } = await base44.functions.invoke('consultarStatusPagamentos', {
        [cleanDoc.length <= 11 ? 'cpf' : 'cnpj']: cleanDoc
      });

      setPagamentos(data);
      
      if (!data.pagamentos || data.pagamentos.length === 0) {
        setError("Nenhum pagamento encontrado para este documento");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Nenhum pagamento encontrado para este documento");
      } else if (err.response?.status === 429) { // This specific error case was removed from outline, but "preserving all other features" implies it should stay if not explicitly removed. I will keep it.
        setError("Muitas requisições. Aguarde alguns segundos");
      } else if (err.response?.status === 504) {
        setError("Timeout na consulta. Tente novamente");
      } else {
        setError("Erro ao buscar pagamentos. Tente novamente");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportarRelatorio = () => {
    if (!pagamentos?.pagamentos) return;

    const csv = [
      ["DUAM", "Parcela", "Descrição", "Valor", "Vencimento", "Status", "Data Pagamento", "Valor Pago"],
      ...pagamentos.pagamentos.map((p) => [
        p.duam,
        p.parcela,
        p.descricao,
        `R$ ${p.valor.toFixed(2)}`,
        p.vencimento ? new Date(p.vencimento).toLocaleDateString("pt-BR") : "N/D",
        p.status === "pago" ? "Pago" : p.status === "vencido" ? "Vencido" : "Pendente",
        p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "-",
        p.valorPago ? `R$ ${p.valorPago.toFixed(2)}` : "-"
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `status_pagamentos_${new Date().getTime()}.csv`;
    link.click();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pago: { className: "bg-green-100 text-green-800 border-green-300", label: "Pago" },
      pendente: { className: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pendente" },
      vencido: { className: "bg-red-100 text-red-800 border-red-300", label: "Vencido" }
    };
    return badges[status] || badges.pendente;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Status de Pagamentos
          </h1>
          <p className="text-slate-600">
            Acompanhe o status dos seus pagamentos de IPTU
          </p>
        </div>

        {/* Search Card */}
        <Card className="max-w-2xl mx-auto mb-8 shadow-lg border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Consultar Status por CPF/CNPJ
            </CardTitle>
            <CardDescription>
              Digite o CPF ou CNPJ do contribuinte para verificar o status de todos os pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documento">CPF ou CNPJ</Label>
                <Input
                  id="documento"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={documento}
                  onChange={handleDocumentoChange}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                  maxLength={18}
                  className="text-lg"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleBuscar}
                disabled={loading || !documento}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Consultar Status
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && (
          <div className="max-w-6xl mx-auto space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        )}

        {!loading && pagamentos && pagamentos.pagamentos && pagamentos.pagamentos.length > 0 && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Info do Contribuinte */}
            <Card className="border-t-4 border-t-green-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informações do Contribuinte
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={exportarRelatorio}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-600">Nome</p>
                    <p className="font-semibold text-slate-800 text-lg">
                      {pagamentos.contribuinte.nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Documento</p>
                    <p className="font-semibold text-slate-800">
                      {maskCPFCNPJ(pagamentos.contribuinte.documento)}
                    </p>
                  </div>
                </div>

                {/* Resumo */}
                <div className="grid md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-slate-600">Pagos</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{pagamentos.resumo.pagos}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      R$ {pagamentos.resumo.totalValorPago.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <p className="text-sm text-slate-600">Pendentes</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{pagamentos.resumo.pendentes}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      R$ {pagamentos.resumo.totalValorPendente.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-slate-600">Vencidos</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{pagamentos.resumo.vencidos}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      R$ {pagamentos.resumo.totalValorVencido.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <p className="text-sm text-slate-600">Total</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{pagamentos.totalPagamentos}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Pagamentos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="todos">
                  Todos ({pagamentos.totalPagamentos})
                </TabsTrigger>
                <TabsTrigger value="pagos">
                  Pagos ({pagamentos.resumo.pagos})
                </TabsTrigger>
                <TabsTrigger value="pendentes">
                  Pendentes ({pagamentos.resumo.pendentes})
                </TabsTrigger>
                <TabsTrigger value="vencidos">
                  Vencidos ({pagamentos.resumo.vencidos})
                </TabsTrigger>
              </TabsList>

              {/* Tab Todos */}
              <TabsContent value="todos">
                <Card>
                  <CardHeader>
                    <CardTitle>Todos os Pagamentos</CardTitle>
                    <CardDescription>
                      Lista completa de todos os DUAMs e suas parcelas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pagamentos.pagamentos.map((pag, idx) => {
                        const badgeProps = getStatusBadge(pag.status);
                        return (
                          <div
                            key={idx}
                            className={`border rounded-lg p-4 ${
                              pag.status === "pago"
                                ? "bg-green-50 border-green-200"
                                : pag.status === "vencido"
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className={`${badgeProps.className} flex items-center gap-1`}>
                                    {/* Icon removed as per new getStatusBadge definition */}
                                    {badgeProps.label}
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    DUAM {pag.duam} - Parc. {pag.parcela}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-slate-800">
                                  {pag.descricao}
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {pag.imovel.endereco}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                                  <span>
                                    Vencimento:{" "}
                                    {pag.vencimento
                                      ? new Date(pag.vencimento).toLocaleDateString("pt-BR")
                                      : "N/D"}
                                  </span>
                                  {pag.dataPagamento && (
                                    <span className="text-green-600 font-medium">
                                      Pago em:{" "}
                                      {new Date(pag.dataPagamento).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-800">
                                  R$ {(pag.valorPago || pag.valor).toFixed(2)}
                                </p>
                                {pag.linhaDigitavel && pag.status !== "pago" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pag.linhaDigitavel);
                                      alert("Linha digitável copiada!");
                                    }}
                                  >
                                    Copiar Linha
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Pagos */}
              <TabsContent value="pagos">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Pagamentos Confirmados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pagamentos.pagamentos
                        .filter((p) => p.status === "pago")
                        .map((pag, idx) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 bg-green-50 border-green-200"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-800">
                                  {pag.descricao}
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {pag.imovel.endereco}
                                </p>
                                <p className="text-sm text-green-600 font-medium mt-2">
                                  Pago em:{" "}
                                  {new Date(pag.dataPagamento).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  R$ {pag.valorPago.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Pendentes */}
              <TabsContent value="pendentes">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      Pagamentos Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pagamentos.pagamentos
                        .filter((p) => p.status === "pendente")
                        .map((pag, idx) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 bg-white border-slate-200"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-800">
                                  {pag.descricao}
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {pag.imovel.endereco}
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                  Vencimento:{" "}
                                  {new Date(pag.vencimento).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-800">
                                  R$ {pag.valor.toFixed(2)}
                                </p>
                                {pag.linhaDigitavel && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pag.linhaDigitavel);
                                      alert("Linha digitável copiada!");
                                    }}
                                  >
                                    Copiar Linha
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Vencidos */}
              <TabsContent value="vencidos">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Pagamentos Vencidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Atenção! Pagamentos vencidos podem gerar juros e multa adicionais.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-3">
                      {pagamentos.pagamentos
                        .filter((p) => p.status === "vencido")
                        .map((pag, idx) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 bg-red-50 border-red-200"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-800">
                                  {pag.descricao}
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {pag.imovel.endereco}
                                </p>
                                <p className="text-sm text-red-600 font-medium mt-2">
                                  Vencido em:{" "}
                                  {new Date(pag.vencimento).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">
                                  R$ {pag.valor.toFixed(2)}
                                </p>
                                {pag.linhaDigitavel && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pag.linhaDigitavel);
                                      alert("Linha digitável copiada!");
                                    }}
                                  >
                                    Copiar Linha
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Info adicional */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <p className="text-sm text-blue-900">
                  <strong>Última atualização:</strong>{" "}
                  {new Date(pagamentos.dataConsulta).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Os dados são atualizados em tempo real. Para informações mais recentes, 
                  clique no botão "Consultar Status" novamente.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-4xl mx-auto mt-12 text-center text-sm text-slate-500">
          <p>Fonte: SIG Integração / Prefeitura de Araguaína</p>
          <p className="mt-2">Dados atualizados em tempo real</p>
        </div>
      </div>
    </div>
  );
}
