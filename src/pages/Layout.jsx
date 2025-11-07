

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, ExternalLink } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  // Verifica se é a página Master para não mostrar o layout padrão
  if (currentPageName === "Master" || location.pathname.includes("/Master")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  IPTU Araguaína
                </h1>
                <p className="text-xs text-slate-500">Consulta Pública</p>
              </div>
            </Link>

            {/* Mobile Menu Button - Apenas para mobile */}
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Coluna 1 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-800">
                  Prefeitura de Araguaína
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sistema de consulta pública de débitos imobiliários. 
                Consulte seus impostos e emita boletos de forma rápida e segura.
              </p>
            </div>

            {/* Coluna 2 */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">
                Links Úteis
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://araguaina.prodataweb.inf.br/sig/app.html#/servicosonline/andamento-processo/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Andamento de Processos
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://transparencia.araguaina.to.gov.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Portal da Transparência
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://araguaina.prodataweb.inf.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    SIG Integração
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3 */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">
                Informações
              </h3>
              <div className="text-sm text-slate-600 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Dados atualizados em tempo real via SIG Integração</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Consultas protegidas por LGPD</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Sistema seguro e criptografado</span>
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-200 mt-8 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
              <p>
                © {new Date().getFullYear()} Prefeitura Municipal de Araguaína - TO
              </p>
              <p className="flex items-center gap-1">
                <span className="font-medium">Fonte:</span> SIG Integração / Prefeitura de Araguaína
              </p>
            </div>
            
            {/* Developer Credit */}
            <div className="text-center mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Desenvolvido por{" "}
                <a
                  href="https://mtsferreira.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  MtsFerreira
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS personalizado */}
      <style>{`
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

