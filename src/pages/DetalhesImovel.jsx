import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

function safeValue(value, defaultValue = "N/D") {
  if (value === null || value === undefined || value === "") return defaultValue;
  return value;
}

function safeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

export default function DetalhesImovel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [detalhes, setDetalhes] = useState(null);
  const [debitos, setDebitos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDebitos, setLoadingDebitos] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inscricao = params.get("inscricao");
    const cci = params.get("cci");

    if (!inscricao && !cci) {
      navigate(createPageUrl("Home"));
      return;
    }

    buscarDetalhes({ inscricao, cci });
    buscarDebitos({ inscricao, cci });
  }, [location.search, navigate]);

  const buscarDetalhes = async (params) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await base44.functions.invoke('consultarDetalhesImovel', params);
      setDetalhes(data);
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
      if (err.response?.status === 404) {
        setError("Imóvel não encontrado");
      } else if (err.response?.status === 504) {
        setError("Timeout na consulta. Tente novamente");
      } else {
        setError("Erro ao buscar detalhes. Tente novamente");
      }
    } finally {
      setLoading(false);
    }
  };

  const buscarDebitos = async (params) => {
    setLoadingDebitos(true);

    try {
      const { data } = await base44.functions.invoke('consultarDebitos', params);
      setDebitos(data);
    } catch (err) {
      console.warn("Não foi possível carregar débitos:", err);
    } finally {
      setLoadingDebitos(false);
    }
  };

  const handleVerDebitos = () => {
    const params = new URLSearchParams();
    if (detalhes.inscricao) params.set("inscricao", detalhes.inscricao);
    else if (detalhes.cci) params.set("cci", detalhes.cci);
    navigate(`${createPageUrl("Debitos")}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="max-w-6xl mx-auto space-y-4">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Alert variant="destructive" className="max-w-4xl mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800">
              Detalhes Completos do Imóvel
            </h1>
            {(debitos?.itens?.length > 0 || debitos?.quantidadeDebitos > 0) && (
              <Button onClick={handleVerDebitos} className="bg-red-600 hover:bg-red-700">
                <TrendingDown className="w-4 h-4 mr-2" />
                Ver Débitos ({debitos?.quantidadeDebitos || 0})
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Identificação e Status Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-600">Inscrição Imobiliária</p>
                  <p className="text-xl font-bold text-slate-800">{safeValue(detalhes.inscricao)}</p>
                  {detalhes.inscricaoAnterior && (
                    <p className="text-xs text-slate-500">Anterior: {detalhes.inscricaoAnterior}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">CCI</p>
                  <p className="text-xl font-bold text-slate-800">{safeValue(detalhes.cci)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Tipo de Imóvel</p>
                  <Badge className="mt-1 text-sm">{safeValue(detalhes.dadosCadastrais?.tipoImovel)}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status Fiscal</p>
                  <Badge 
                    variant={debitos?.quantidadeDebitos > 0 ? "destructive" : "outline"}
                    className="mt-1"
                  >
                    {loadingDebitos ? "Carregando..." : 
                     debitos?.quantidadeDebitos > 0 ? 
                     `${debitos.quantidadeDebitos} Débito(s)` : 
                     "Em Dia"}
                  </Badge>
                </div>
              </div>

              {!loadingDebitos && debitos && (
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Valor Venal</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {safeNumber(detalhes.dadosCadastrais?.valorVenal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Total de Débitos</p>
                    <p className={`text-2xl font-bold ${debitos.totalDebitos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {safeNumber(debitos.totalDebitos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Endereço</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {safeValue(detalhes.endereco?.enderecoCompleto)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Proprietário</p>
                  <p className="font-semibold text-slate-800">
                    {safeValue(detalhes.proprietario?.nome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Bairro</p>
                  <p className="font-semibold text-slate-800">
                    {safeValue(detalhes.endereco?.bairroInfo?.nome)}
                  </p>
                </div>
                {detalhes.dadosCadastrais?.areaLote && (
                  <div>
                    <p className="text-sm text-slate-600">Área do Lote</p>
                    <p className="font-semibold text-slate-800">
                      {safeNumber(detalhes.dadosCadastrais.areaLote).toFixed(2)} m²
                    </p>
                  </div>
                )}
                {detalhes.dadosCadastrais?.areaConstruida && (
                  <div>
                    <p className="text-sm text-slate-600">Área Construída</p>
                    <p className="font-semibold text-slate-800">
                      {safeNumber(detalhes.dadosCadastrais.areaConstruida).toFixed(2)} m²
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto mt-12 text-center text-sm text-slate-500">
          <p>Fonte: SIG Integração / Prefeitura de Araguaína</p>
          <p className="mt-2">Dados atualizados em tempo real</p>
        </div>
      </div>
    </div>
  );
}