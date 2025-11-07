
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  RefreshCw,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Server,
  Zap,
  Database
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function MonitoramentoAPI() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadMetrics();
    // Auto-refresh a cada 60 segundos
    const interval = setInterval(() => loadMetrics(true), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Carrega logs do localStorage
    const savedLogs = localStorage.getItem("api_logs");
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        setLogs(parsed.slice(-100).reverse());
      } catch (e) {
        console.error("Erro ao carregar logs:", e);
      }
    }
  }, []);

  const loadMetrics = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setRefreshing(true);
    }

    try {
      const { data } = await base44.functions.invoke('getApiMetrics');
      setMetrics(data);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "text-green-600 bg-green-50 border-green-200";
      case "error": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "offline": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "online": return <CheckCircle className="w-5 h-5" />;
      case "error": return <AlertCircle className="w-5 h-5" />;
      case "offline": return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5 animate-pulse" />;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "critical": return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case "critical": return "bg-red-500/20 border-red-400/30";
      case "warning": return "bg-yellow-500/20 border-yellow-400/30";
      default: return "bg-blue-500/20 border-blue-400/30";
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Core": "bg-blue-600",
      "Consultas": "bg-purple-600",
      "Pagamentos": "bg-green-600",
      "Financeiro": "bg-orange-600",
      "Outros": "bg-gray-600"
    };
    return colors[category] || "bg-gray-600";
  };

  const filteredEndpoints = selectedCategory === "all"
    ? metrics?.endpoints
    : metrics?.endpoints?.filter(e => e.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Server className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Master"))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Server className="w-8 h-8" />
                Monitoramento API Completo
              </h1>
              <p className="text-blue-200">Status em tempo real de todos os serviços</p>
            </div>
          </div>

          <Button
            onClick={() => loadMetrics()}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border-white/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        {/* Métricas Gerais */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Disponibilidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-bold text-white">
                    {metrics?.stats?.availability || 0}%
                  </p>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <Progress
                  value={metrics?.stats?.availability || 0}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Tempo Médio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold text-white">
                    {metrics?.stats?.averageResponseTime || 0}
                  </p>
                  <p className="text-sm text-blue-300">milissegundos</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Online</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-green-400">
                  {metrics?.stats?.onlineEndpoints || 0}
                </p>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Com Erro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-yellow-400">
                  {metrics?.stats?.errorEndpoints || 0}
                </p>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Offline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-red-400">
                  {metrics?.stats?.offlineEndpoints || 0}
                </p>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtro por Categoria */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className={selectedCategory === "all" ? "bg-white text-slate-900" : "bg-white/10 text-white border-white/30"}
            >
              Todos ({metrics?.stats?.totalEndpoints || 0})
            </Button>
            {metrics?.endpointsByCategory && Object.entries(metrics.endpointsByCategory).map(([category, endpoints]) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-white text-slate-900" : "bg-white/10 text-white border-white/30"}
              >
                {category} ({endpoints.length})
              </Button>
            ))}
          </div>
        </div>

        {/* Taxa de Erro por Categoria */}
        {metrics?.errorRateByCategory && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {Object.entries(metrics.errorRateByCategory).map(([category, data]) => (
              <Card key={category} className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <span className={`text-lg font-bold ${data.errorRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {data.errorRate}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-200">
                    {data.errors} de {data.total} com erro
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Status dos Endpoints */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Status dos Endpoints ({filteredEndpoints?.length || 0})
            </CardTitle>
            <CardDescription className="text-blue-200">
              Monitoramento em tempo real com correlation IDs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEndpoints?.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className={`rounded-lg p-4 border ${getStatusColor(endpoint.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2">
                        {getStatusIcon(endpoint.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{endpoint.name}</h3>
                          <Badge className={`${getCategoryColor(endpoint.category)} text-white text-xs`}>
                            {endpoint.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-80 font-mono text-xs">
                          {endpoint.url}
                        </p>
                        <p className="text-xs opacity-60 mt-1 font-mono">
                          Correlation ID: {endpoint.correlationId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm opacity-80">Tempo</p>
                        <p className="text-lg font-semibold flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {endpoint.responseTime}ms
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm opacity-80">HTTP</p>
                        <p className="text-lg font-semibold">
                          {endpoint.statusCode || "-"}
                        </p>
                      </div>

                      <div className="text-right min-w-[120px]">
                        <p className="text-sm opacity-80">Última Check</p>
                        <p className="text-sm font-medium">
                          {endpoint.lastCheck
                            ? new Date(endpoint.lastCheck).toLocaleTimeString("pt-BR")
                            : "Nunca"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {endpoint.error && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-sm font-medium">Erro: {endpoint.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Alertas Recentes */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas Críticos
              </CardTitle>
              <CardDescription className="text-blue-200">
                Problemas detectados que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!metrics?.alerts || metrics.alerts.length === 0 ? (
                  <div className="text-center py-8 text-blue-200">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>Nenhum alerta no momento</p>
                    <p className="text-sm mt-1 opacity-70">Todos os sistemas operacionais</p>
                  </div>
                ) : (
                  metrics.alerts.map((alerta) => (
                    <Alert
                      key={alerta.id}
                      className={getAlertStyle(alerta.type)}
                    >
                      {getAlertIcon(alerta.type)}
                      <AlertDescription className="text-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold">{alerta.endpoint}</p>
                            <p className="text-sm opacity-90 mt-1">{alerta.message}</p>
                          </div>
                          <span className="text-xs opacity-70 whitespace-nowrap">
                            {new Date(alerta.timestamp).toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logs de Requisições */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Logs de Requisições
              </CardTitle>
              <CardDescription className="text-blue-200">
                Últimas 100 chamadas à API com correlation IDs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-blue-200 text-center py-8 text-sm">
                    Nenhum log disponível ainda.<br/>
                    Os logs aparecem conforme as chamadas à API forem realizadas.
                  </p>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded p-3 border border-white/10 text-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={log.success ? "bg-green-600" : "bg-red-600"}>
                          {log.method} {log.status}
                        </Badge>
                        <span className="text-xs text-blue-300">
                          {new Date(log.data).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-white font-mono text-xs mb-1 truncate">
                        {log.endpoint}
                      </p>
                      {log.correlationId && (
                        <p className="text-blue-300 text-xs font-mono">
                          ID: {log.correlationId}
                        </p>
                      )}
                      {log.tempo && (
                        <p className="text-blue-300 text-xs mt-1">
                          ⚡ {log.tempo}ms
                        </p>
                      )}
                      {log.error && (
                        <p className="text-red-300 text-xs mt-2">
                          Erro: {log.error}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Adicional */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-blue-200 text-sm">
              <div>
                <p><strong>Última atualização:</strong> {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString("pt-BR") : "Nunca"}</p>
                <p className="mt-1 text-xs opacity-70">
                  Atualização automática a cada 60 segundos
                </p>
              </div>
              <Badge className="bg-blue-600 text-white">
                Sistema de Monitoramento Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm space-y-2">
          <p>Sistema de Monitoramento Completo - IPTU Araguaína</p>
          <p className="text-blue-100">
            Desenvolvido por{" "}
            <a
              href="https://mtsferreira.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:text-blue-300 hover:underline transition-colors"
            >
              MtsFerreira
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
