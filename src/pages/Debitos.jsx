
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, AlertCircle, Calculator, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { municipalApi } from "@/api/municipalClient";
import { createPageUrl } from "@/utils";

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

export default function Debitos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [debitos, setDebitos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inscricao = params.get("inscricao");
    const cci = params.get("cci");
    const ccp = params.get("ccp");

    if (!inscricao && !cci && !ccp) {
      navigate(createPageUrl("Home"));
      return;
    }

    buscarDebitos({ inscricao, cci, ccp });
  }, [location.search, navigate]);

  const buscarDebitos = async (params) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await municipalApi.functions.invoke('consultarDebitos', params);
      setDebitos(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Nenhum débito encontrado para este imóvel");
      } else if (err.response?.status === 504) {
        setError("Timeout na consulta. Tente novamente");
      } else if (err.response?.status === 429) {
        setError("Muitas requisições. Aguarde alguns segundos");
      } else {
        setError("Erro ao buscar débitos. Tente novamente");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelecionado = (itemId) => {
    setSelecionados((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleTodos = () => {
    if (debitos && debitos.itens && selecionados.length === debitos.itens.length) {
      setSelecionados([]);
    } else {
      setSelecionados(debitos?.itens?.map((item) => item.id) || []);
    }
  };

  const handleSimular = () => {
    if (selecionados.length === 0) {
      return;
    }

    const itensSelecionados = debitos.itens.filter((item) =>
      selecionados.includes(item.id)
    );

    navigate(createPageUrl("Simulacao"), {
      state: {
        imovel: debitos.imovel,
        proprietario: debitos.proprietario,
        itens: itensSelecionados,
      },
    });
  };

  const handleVerDetalhes = () => {
    const params = new URLSearchParams();
    if (debitos.imovel.inscricao) params.set("inscricao", debitos.imovel.inscricao);
    if (debitos.imovel.cci) params.set("cci", debitos.imovel.cci);
    navigate(`${createPageUrl("DetalhesImovel")}?${params.toString()}`);
  };

  const calcularTotal = () => {
    if (!debitos?.itens) return 0;
    return debitos.itens
      .filter((item) => selecionados.includes(item.id))
      .reduce((sum, item) => sum + (item.valor || 0), 0);
  };

  const calcularTotalGeral = () => {
    if (!debitos?.itens) return { total: 0, desconto: 0, aPagar: 0 };
    
    const total = debitos.itens.reduce((sum, item) => sum + (item.valorOriginal || item.valor || 0), 0);
    const desconto = debitos.itens.reduce((sum, item) => sum + (item.desconto || 0), 0);
    const aPagar = debitos.itens.reduce((sum, item) => sum + (item.valor || 0), 0);
    
    return { total, desconto, aPagar };
  };

  const totaisGerais = calcularTotalGeral();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="max-w-6xl mx-auto space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Home"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">
            Débitos do Imóvel
          </h1>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-6xl mx-auto mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && debitos && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Info do Imóvel */}
            <Card className="border-t-4 border-t-blue-600 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informações do Imóvel
                  </CardTitle>
                  {(debitos.imovel?.inscricao || debitos.imovel?.cci) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerDetalhes}
                    >
                      <Info className="w-4 h-4 mr-2" />
                      Ver Detalhes Completos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-600">CPF/CNPJ</p>
                    <p className="font-semibold text-slate-800">
                      {maskCPFCNPJ(debitos.proprietario?.documento || "")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">CCP</p>
                    <p className="font-semibold text-slate-800">
                      {debitos.imovel?.ccp || "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Inscrição</p>
                    <p className="font-semibold text-slate-800">
                      {debitos.imovel?.inscricao || "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">CCI</p>
                    <p className="font-semibold text-slate-800">
                      {debitos.imovel?.cci || "N/D"}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-600">Contribuinte</p>
                    <p className="font-semibold text-slate-800 text-lg">
                      {debitos.proprietario?.nome || "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Endereço</p>
                    <p className="font-semibold text-slate-800">
                      {debitos.imovel?.endereco || "N/D"}
                    </p>
                  </div>
                </div>

                {/* Resumo de Totais - Estilo Prodata */}
                <div className="mt-4 pt-4 border-t">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Total débito</p>
                      <p className="text-xl font-bold text-red-600">
                        R$ {totaisGerais.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-xs text-green-700 mb-1">Total desconto</p>
                      <p className="text-xl font-bold text-green-700">
                        R$ {totaisGerais.desconto.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs text-blue-700 mb-1">Total a pagar</p>
                      <p className="text-xl font-bold text-blue-700">
                        R$ {totaisGerais.aPagar.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Débitos - Estilo Tabela Prodata */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Débitos Pendentes</CardTitle>
                    <CardDescription>
                      Selecione os débitos que deseja parcelar (até 10x)
                    </CardDescription>
                  </div>
                  {debitos.itens && debitos.itens.length > 0 && (
                    <Button variant="outline" size="sm" onClick={toggleTodos}>
                      {selecionados.length === debitos.itens.length
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!debitos.itens || debitos.itens.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      Nenhum Débito Encontrado
                    </h3>
                    <p className="text-slate-600">
                      Este imóvel não possui débitos pendentes
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="p-3 text-left font-semibold text-slate-700">
                            <Checkbox
                              checked={selecionados.length === debitos.itens.length && debitos.itens.length > 0}
                              onCheckedChange={toggleTodos}
                            />
                          </th>
                          <th className="p-3 text-left font-semibold text-slate-700">DUAM</th>
                          <th className="p-3 text-left font-semibold text-slate-700">CCI</th>
                          <th className="p-3 text-left font-semibold text-slate-700">Exercício</th>
                          <th className="p-3 text-left font-semibold text-slate-700">Receita</th>
                          <th className="p-3 text-left font-semibold text-slate-700">Parcelas</th>
                          <th className="p-3 text-left font-semibold text-slate-700">Vencimento</th>
                          <th className="p-3 text-right font-semibold text-slate-700">Valor débito</th>
                          <th className="p-3 text-right font-semibold text-slate-700">Desconto</th>
                          <th className="p-3 text-right font-semibold text-slate-700">Valor a pagar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debitos.itens.map((item) => {
                          const partes = item.id.split("-");
                          const duam = partes[0];
                          
                          // Extrai exercício da descrição (ex: "IPTU - 2025")
                          const exercicioMatch = item.descricao.match(/\b(20\d{2})\b/);
                          const exercicio = exercicioMatch ? exercicioMatch[1] : "-";
                          
                          // Extrai receita da descrição (ex: "HONAD", "IPTU")
                          const receitaMatch = item.descricao.match(/^([A-Z]+)/);
                          const receita = receitaMatch ? receitaMatch[1] : item.descricao.split(' ')[0]; // Fallback to first word

                          return (
                            <tr
                              key={item.id}
                              className={`border-b hover:bg-slate-50 transition-colors ${
                                selecionados.includes(item.id) ? "bg-blue-50" : ""
                              }`}
                            >
                              <td className="p-3">
                                <Checkbox
                                  id={item.id}
                                  checked={selecionados.includes(item.id)}
                                  onCheckedChange={() => toggleSelecionado(item.id)}
                                />
                              </td>
                              <td className="p-3 font-mono text-blue-600">{duam}</td>
                              <td className="p-3">{debitos.imovel?.cci || "0"}</td>
                              <td className="p-3">{exercicio}</td>
                              <td className="p-3 font-semibold">{receita}</td>
                              <td className="p-3">Única</td>
                              <td className="p-3">
                                {item.vencimento
                                  ? new Date(item.vencimento).toLocaleDateString("pt-BR")
                                  : "-"}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                R$ {(item.valorOriginal || item.valor || 0)?.toFixed(2)}
                              </td>
                              <td className="p-3 text-right text-green-600 font-semibold">
                                {item.desconto ? `R$ ${item.desconto.toFixed(2)}` : "R$ 0.00"}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-800">
                                R$ {item.valor?.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totais e Ação */}
            {debitos.itens && debitos.itens.length > 0 && (
              <Card className="border-t-4 border-t-green-600 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">
                        Total Selecionado ({selecionados.length}{" "}
                        {selecionados.length === 1 ? "item" : "itens"})
                      </p>
                      <p className="text-3xl font-bold text-slate-800">
                        R$ {calcularTotal().toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Parcele em até 10x no boleto
                      </p>
                    </div>
                    <Button
                      onClick={handleSimular}
                      disabled={selecionados.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Simular Parcelamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="max-w-6xl mx-auto mt-12 text-center text-sm text-slate-500">
          <p>Fonte: SIG Integração / Prefeitura de Araguaína</p>
        </div>
      </div>
    </div>
  );
}
