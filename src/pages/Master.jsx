import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Home,
  FileText,
  Calculator,
  TrendingUp,
  Settings,
  Building2,
  Search,
  Info,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";

export default function Master() {
  const navigate = useNavigate();

  // Páginas do sistema
  const systemPages = [
    {
      name: "Home",
      icon: Home,
      description: "Página inicial com busca de imóveis",
      color: "bg-blue-500",
      path: "Home"
    },
    {
      name: "Débitos",
      icon: FileText,
      description: "Consulta de débitos de imóveis",
      color: "bg-red-500",
      path: "Debitos"
    },
    {
      name: "Simulação",
      icon: Calculator,
      description: "Simular parcelamento e gerar boletos",
      color: "bg-green-500",
      path: "Simulacao"
    },
    {
      name: "Status Pagamentos",
      icon: TrendingUp,
      description: "Acompanhar status de pagamentos",
      color: "bg-purple-500",
      path: "StatusPagamentos"
    },
    {
      name: "Detalhes Imóvel",
      icon: Building2,
      description: "Informações completas do imóvel",
      color: "bg-orange-500",
      path: "DetalhesImovel"
    },
    {
      name: "Monitoramento API",
      icon: Settings,
      description: "Dashboard de monitoramento Prodata",
      color: "bg-indigo-500",
      path: "MonitoramentoAPI"
    },
    {
      name: "Configurações",
      icon: Settings,
      description: "Configurações do usuário",
      color: "bg-slate-500",
      path: "UserSettings"
    }
  ];

  // Estatísticas rápidas
  const stats = {
    totalConsultas: 1247,
    usuariosAtivos: 89,
    boletosPendentes: 342,
    sistemasIntegrados: 4
  };

  const navigateToPage = (pageName) => {
    navigate(createPageUrl(pageName));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Painel Master</h1>
              <p className="text-blue-200">Controle total do sistema IPTU Araguaína</p>
            </div>
          </div>

          <Badge className="bg-green-500 text-white px-3 py-1">
            <Info className="w-4 h-4 mr-2" />
            Sistema Operacional
          </Badge>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Total de Consultas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalConsultas}</p>
              <p className="text-sm text-blue-200 mt-1">+12% este mês</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Usuários Ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.usuariosAtivos}</p>
              <p className="text-sm text-blue-200 mt-1">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Boletos Pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.boletosPendentes}</p>
              <p className="text-sm text-blue-200 mt-1">Aguardando pagamento</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-200">Sistemas Integrados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.sistemasIntegrados}</p>
              <p className="text-sm text-blue-200 mt-1">APIs conectadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Navegação Rápida */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Navegação Rápida
            </CardTitle>
            <CardDescription className="text-blue-200">
              Acesse rapidamente qualquer tela do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => navigateToPage(page.path)}
                  className="group bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg p-4 text-left transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 ${page.color} rounded-lg flex items-center justify-center`}>
                      <page.icon className="w-5 h-5 text-white" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{page.name}</h3>
                  <p className="text-sm text-blue-200">{page.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-2">APIs Integradas</h4>
                <div className="space-y-2 text-sm text-blue-200">
                  <p>• Prodata SIG Integração</p>
                  <p>• Mercado Pago (Pagamentos)</p>
                  <p>• Sistema de Emissão DUAM</p>
                  <p>• Consulta de Status</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Funcionalidades</h4>
                <div className="space-y-2 text-sm text-blue-200">
                  <p>• Consulta de Imóveis</p>
                  <p>• Débitos em tempo real</p>
                  <p>• Simulação de parcelamento</p>
                  <p>• Emissão de boletos</p>
                  <p>• Pagamento online</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Status do Sistema</h4>
                <div className="space-y-2 text-sm text-blue-200">
                  <p>• Sistema: Operacional ✓</p>
                  <p>• API Prodata: Online ✓</p>
                  <p>• Pagamentos: Disponível ✓</p>
                  <p>• Monitoramento: Ativo ✓</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm space-y-2">
          <p>IPTU Araguaína - Painel Administrativo Master</p>
          <p>Sistema de Gestão Tributária Municipal</p>
          <p className="text-blue-100 mt-4">
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