
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, FileText, Calculator, Info, TrendingUp, AlertTriangle, Filter, X, History, ChevronDown } from "lucide-react";
import ManualUso from "../components/ManualUso";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { municipalApi } from "@/api/municipalClient";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function Home() {
  const navigate = useNavigate();
  const [documento, setDocumento] = useState("");
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // const [debugInfo, setDebugInfo] = useState(null); // Removed

  // Novos estados para busca avançada
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    endereco: "",
    inscricao: "",
    status: "todos"
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [showManual, setShowManual] = useState(false);

  // Carrega CPF/CNPJ salvo do Master na inicialização
  useEffect(() => {
    const savedCpfCnpj = localStorage.getItem("master_cpfcnpj");
    if (savedCpfCnpj) {
      setDocumento(maskCPFCNPJ(savedCpfCnpj));
      
      // Auto-busca se veio do Master
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("auto") === "true") {
        // Remove o parâmetro da URL
        window.history.replaceState({}, '', window.location.pathname);
        
        // Executa busca após um pequeno delay
        setTimeout(() => {
          buscarImoveis(savedCpfCnpj).catch(err => {
            console.error("Erro na auto-busca:", err);
            setError("Erro ao carregar dados automaticamente");
            setLoading(false);
          });
        }, 300);
      }
    }
  }, []);

  // Carrega histórico de buscas (sem login necessário - usa localStorage)
  useEffect(() => {
    loadSearchHistory().catch(err => {
      console.error("Erro ao carregar histórico:", err);
      // Não mostra erro ao usuário, apenas log
    });
  }, []);

  const loadSearchHistory = async () => {
    try {
      // Tenta carregar do usuário logado primeiro
      const user = await municipalApi.auth.me().catch(() => null);
      if (user?.historico_buscas) {
        setSearchHistory(user.historico_buscas.slice(-10).reverse());
      } else {
        // Se não estiver logado ou sem histórico no perfil, usa localStorage
        const localHistory = localStorage.getItem("search_history");
        if (localHistory) {
          try {
            const parsed = JSON.parse(localHistory);
            if (Array.isArray(parsed)) {
              setSearchHistory(parsed.slice(-10).reverse());
            } else {
              // If parsed is not an array, it's corrupted, clear it.
              console.log("Histórico local corrompido, resetando");
              localStorage.removeItem("search_history");
              setSearchHistory([]);
            }
          } catch (e) {
            console.log("Erro ao parsear histórico local", e);
            localStorage.removeItem("search_history");
            setSearchHistory([]);
          }
        }
      }
    } catch (error) {
      // Fallback final para localStorage
      console.log("Erro ao carregar histórico:", error);
      try {
        const localHistory = localStorage.getItem("search_history");
        if (localHistory) {
          const parsed = JSON.parse(localHistory);
          if (Array.isArray(parsed)) {
            setSearchHistory(parsed.slice(-10).reverse());
          }
        }
      } catch (e) {
        console.log("Erro no fallback do histórico", e);
        setSearchHistory([]);
      }
    }
  };

  const saveToSearchHistory = async (tipo, valor) => {
    try {
      const novaBusca = {
        tipo,
        valor,
        data: new Date().toISOString()
      };

      // Tenta salvar no usuário se estiver logado
      try {
        const user = await municipalApi.auth.me().catch(() => null);
        if (user) {
          const historico = Array.isArray(user?.historico_buscas) ? user.historico_buscas : [];
          const filteredHistorico = historico.filter(item => item.valor !== novaBusca.valor);
          const novoHistorico = [...filteredHistorico, novaBusca].slice(-50);
          
          await municipalApi.auth.updateMe({ historico_buscas: novoHistorico });
          setSearchHistory(novoHistorico.slice(-10).reverse());
          return;
        }
      } catch (userError) {
        console.log("Não foi possível salvar no perfil:", userError);
      }

      // Fallback: salva no localStorage
      const localHistory = localStorage.getItem("search_history");
      let historico = [];
      if (localHistory) {
        try {
          const parsed = JSON.parse(localHistory);
          historico = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.log("Histórico local corrompido, resetando");
          historico = [];
        }
      }
      const filteredHistorico = historico.filter(item => item.valor !== novaBusca.valor);
      const novoHistorico = [...filteredHistorico, novaBusca].slice(-50);
      localStorage.setItem("search_history", JSON.stringify(novoHistorico));
      setSearchHistory(novoHistorico.slice(-10).reverse());
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
      // Não mostra erro ao usuário
    }
  };

  const handleDocumentoChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setDocumento(maskCPFCNPJ(value));
    setError("");
    // setDebugInfo(null); // Removed
  };

  const buscarImoveis = async (cpfCnpjParaBuscar) => {
    try {
      const cleanDoc = cpfCnpjParaBuscar ? cpfCnpjParaBuscar.replace(/\D/g, "") : documento.replace(/\D/g, "");
      
      console.log("=== INICIANDO BUSCA ===");
      console.log("CPF/CNPJ:", cleanDoc);
      
      if (!validateCPFCNPJ(cleanDoc)) {
        setError("CPF ou CNPJ inválido");
        setLoading(false); // Ensure loading is reset on validation error
        return;
      }

      setLoading(true);
      setError("");
      setImoveis([]);
      // setDebugInfo(null); // Removed

      console.log("Chamando função consultarContribuinte...");
      
      const { data } = await municipalApi.functions.invoke('consultarContribuinte', {
        [cleanDoc.length <= 11 ? 'cpf' : 'cnpj']: cleanDoc
      });

      console.log("Resposta recebida:", data);

      // Verifica se tem informações de debug // Removed
      // if (data && data.debug) { // Removed
      //   setDebugInfo(data.debug); // Removed
      // } // Removed

      // Se tem mensagem mas sem imóveis
      if (data && data.mensagem && data.totalImoveis === 0) {
        setError(data.mensagem);
        setImoveis([]);
        setLoading(false);
        return;
      }

      // Garante que itens é um array
      const imoveisRecebidos = Array.isArray(data?.itens) ? data.itens : [];
      setImoveis(imoveisRecebidos);
      
      if (imoveisRecebidos.length === 0) {
        setError("Nenhum imóvel encontrado para este documento");
      } else {
        // Salva no histórico
        await saveToSearchHistory(cleanDoc.length <= 11 ? 'cpf' : 'cnpj', cleanDoc);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      console.error("Erro response:", err.response);
      
      // Tenta extrair debug do erro // Removed
      // if (err.response?.data?.debug) { // Removed
      //   setDebugInfo(err.response.data.debug); // Removed
      // } // Removed

      // Tratamento de erros específicos
      let mensagemErro = "Erro ao buscar imóveis. Tente novamente";
      
      if (err.response?.status === 404) {
        mensagemErro = err.response?.data?.error || "Nenhum imóvel encontrado para este documento";
      } else if (err.response?.status === 429) {
        mensagemErro = "Muitas requisições. Aguarde alguns segundos";
      } else if (err.response?.status === 504) {
        mensagemErro = "Timeout na consulta. Tente novamente";
      } else if (err.response?.status === 503) {
        mensagemErro = err.response?.data?.error || "Serviço temporariamente indisponível. Tente novamente";
      } else if (err.response?.data?.error) {
        mensagemErro = err.response.data.error;
      } else if (err.message) {
        mensagemErro = `Erro: ${err.message}`;
      }
      
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    buscarImoveis().catch(err => {
      console.error("Erro não tratado em handleBuscar:", err);
      setError("Erro inesperado. Tente novamente");
      setLoading(false); // Ensure loading is reset
    });
  };

  const applyFilters = (imoveisList) => {
    let filtered = [...imoveisList];

    // Filtro por endereço
    if (filters.endereco) {
      filtered = filtered.filter(imovel => 
        imovel.endereco?.toLowerCase().includes(filters.endereco.toLowerCase())
      );
    }

    // Filtro por inscrição
    if (filters.inscricao) {
      filtered = filtered.filter(imovel => 
        imovel.inscricao?.includes(filters.inscricao)
      );
    }

    // Filtro por status
    if (filters.status !== "todos") {
      filtered = filtered.filter(imovel => 
        imovel.situacao?.toLowerCase() === filters.status.toLowerCase()
      );
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      endereco: "",
      inscricao: "",
      status: "todos"
    });
  };

  const hasActiveFilters = filters.endereco || filters.inscricao || filters.status !== "todos";
  const imoveisFiltrados = applyFilters(imoveis);

  const loadFromHistory = (busca) => {
    try {
      setDocumento(maskCPFCNPJ(busca.valor));
      setShowAdvancedFilters(false);
      // Auto-search after a short delay
      setTimeout(() => {
        buscarImoveis(busca.valor).catch(err => {
          console.error("Erro ao carregar do histórico:", err);
          setError("Erro ao carregar busca do histórico");
          setLoading(false);
        });
      }, 300);
    } catch (error) {
      console.error("Erro em loadFromHistory:", error);
      setError("Erro ao carregar do histórico");
    }
  };

  const handleVerDebitos = (imovel) => {
    const identificador = imovel.inscricao || imovel.cci || imovel.ccp;
    const tipo = imovel.inscricao ? "inscricao" : imovel.cci ? "cci" : "ccp";
    navigate(`${createPageUrl("Debitos")}?${tipo}=${encodeURIComponent(identificador)}`);
  };

  const handleVerDetalhes = (imovel) => {
    const params = new URLSearchParams();
    if (imovel.inscricao) params.set("inscricao", imovel.inscricao);
    if (imovel.cci) params.set("cci", imovel.cci);
    navigate(`${createPageUrl("DetalhesImovel")}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-800">IPTU Araguaína</h1>
          </div>
          <p className="text-lg text-slate-600 mb-4">
            Consulta Pública de Débitos Imobiliários
          </p>
          
          {/* Botão de Ajuda */}
          <Button
            onClick={() => setShowManual(true)}
            variant="outline"
            className="gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Como Usar a Plataforma
          </Button>
        </div>

        {/* Search Card */}
        <Card className="max-w-2xl mx-auto mb-8 shadow-lg border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Consultar Imóveis
            </CardTitle>
            <CardDescription>
              Digite o CPF ou CNPJ do proprietário para consultar imóveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documento">CPF ou CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    id="documento"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={documento}
                    onChange={handleDocumentoChange}
                    onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                    maxLength={18}
                    className="text-lg flex-1"
                  />
                  
                  {/* Histórico Dropdown */}
                  {searchHistory.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <History className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="px-2 py-1.5 text-sm font-semibold text-slate-700">
                          Buscas Recentes
                        </div>
                        {searchHistory.map((busca, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onClick={() => loadFromHistory(busca)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1 w-full">
                              <span className="font-mono text-sm">{maskCPFCNPJ(busca.valor)}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(busca.data).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Debug Info Removed */}
              {/* {debugInfo && (
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertDescription className="text-yellow-900 text-xs">
                    <strong>Debug Info:</strong>
                    <pre className="mt-2 p-2 bg-yellow-100 rounded overflow-x-auto">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )} */}

              <Button
                onClick={handleBuscar}
                disabled={loading || !documento}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Skeleton className="w-4 h-4 mr-2 rounded-full bg-white/50 animate-pulse" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Imóveis
                  </>
                )}
              </Button>

              {/* Advanced Filters Toggle */}
              {imoveis.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros Avançados
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-blue-600">
                      {[filters.endereco, filters.inscricao, filters.status !== "todos"].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && imoveis.length > 0 && (
          <Card className="max-w-2xl mx-auto mb-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros Avançados
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filtro_endereco">Filtrar por Endereço</Label>
                  <Input
                    id="filtro_endereco"
                    placeholder="Ex: Rua das Flores"
                    value={filters.endereco}
                    onChange={(e) => setFilters({...filters, endereco: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filtro_inscricao">Filtrar por Inscrição</Label>
                  <Input
                    id="filtro_inscricao"
                    placeholder="Ex: 12345"
                    value={filters.inscricao}
                    onChange={(e) => setFilters({...filters, inscricao: e.target.value})}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="filtro_status">Filtrar por Status</Label>
                  <div className="flex gap-2">
                    {["todos", "ativo", "inativo"].map((status) => (
                      <Button
                        key={status}
                        variant={filters.status === status ? "default" : "outline"}
                        onClick={() => setFilters({...filters, status})}
                        className={filters.status === status ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    Mostrando <strong>{imoveisFiltrados.length}</strong> de <strong>{imoveis.length}</strong> imóveis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {loading && (
          <div className="max-w-4xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && imoveisFiltrados.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">
                Imóveis Encontrados ({imoveisFiltrados.length})
              </h2>
              {hasActiveFilters && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Filtrado
                </Badge>
              )}
            </div>
            <div className="space-y-4">
              {imoveisFiltrados.map((imovel, idx) => (
                <Card
                  key={idx}
                  className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-800">
                              {imovel.endereco || "Endereço não informado"}
                            </h3>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                              {imovel.inscricao && (
                                <span>
                                  <strong>Inscrição:</strong> {imovel.inscricao}
                                </span>
                              )}
                              {imovel.cci && (
                                <span>
                                  <strong>CCI:</strong> {imovel.cci}
                                </span>
                              )}
                              {imovel.ccp && (
                                <span>
                                  <strong>CCP:</strong> {imovel.ccp}
                                </span>
                              )}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  imovel.situacao === "ATIVO"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {imovel.situacao || "N/D"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => handleVerDebitos(imovel)}
                          className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Débitos
                        </Button>
                        <Button
                          onClick={() => handleVerDetalhes(imovel)}
                          variant="outline"
                          className="flex-1 sm:flex-none"
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Detalhes do Imóvel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!loading && imoveis.length > 0 && imoveisFiltrados.length === 0 && (
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Nenhum imóvel encontrado com os filtros aplicados
            </h3>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Info Cards */}
        <div className="max-w-4xl mx-auto mt-12 grid md:grid-cols-4 gap-6">
          <Card className="border-t-4 border-t-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Consulta Rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Veja todos os seus imóveis e débitos em segundos
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Simulação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Simule parcelamentos e escolha a melhor opção
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Emissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Gere boletos e DUAM para pagamento imediato
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Acompanhe o status dos seus pagamentos
              </p>
              <Button
                variant="link"
                className="p-0 h-auto mt-2 text-orange-600"
                onClick={() => navigate(createPageUrl("StatusPagamentos"))}
              >
                Consultar Status →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="max-w-4xl mx-auto mt-12 text-center text-sm text-slate-500">
          <p>
            Fonte: SIG Integração / Prefeitura de Araguaína
          </p>
          <p className="mt-2">
            Dados atualizados em tempo real
          </p>
        </div>
      </div>

      {/* Modal de Manual */}
      <ManualUso open={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
}
