import React from "react";
import { X, Search, FileText, Calculator, CheckCircle, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ManualUso({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            Manual de Uso - IPTU Araguaína
          </DialogTitle>
          <DialogDescription>
            Guia completo para utilizar a plataforma de consulta e pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seção 1: Consulta */}
          <div className="border-l-4 border-blue-600 pl-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              1. Como Consultar seus Imóveis
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Passo 1:</strong> Digite seu CPF ou CNPJ no campo de busca na página inicial.</p>
              <p><strong>Passo 2:</strong> Clique no botão "Buscar Imóveis".</p>
              <p><strong>Passo 3:</strong> Aguarde alguns segundos enquanto o sistema busca seus imóveis cadastrados.</p>
              <p><strong>Resultado:</strong> Você verá uma lista com todos os seus imóveis, incluindo endereço, inscrição e situação.</p>
            </div>
          </div>

          {/* Seção 2: Débitos */}
          <div className="border-l-4 border-red-600 pl-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              2. Consultando Débitos de um Imóvel
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Passo 1:</strong> Na lista de imóveis, clique no botão "Ver Débitos" do imóvel desejado.</p>
              <p><strong>Passo 2:</strong> O sistema mostrará todos os débitos pendentes, incluindo:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>IPTU atrasado</li>
                <li>Taxas municipais</li>
                <li>Multas e juros</li>
                <li>Data de vencimento</li>
              </ul>
              <p><strong>Dica:</strong> Você pode selecionar quais débitos deseja pagar.</p>
            </div>
          </div>

          {/* Seção 3: Simulação */}
          <div className="border-l-4 border-green-600 pl-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              3. Simulando Parcelamento
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Passo 1:</strong> Após visualizar os débitos, clique em "Simular Parcelamento".</p>
              <p><strong>Passo 2:</strong> Selecione os débitos que deseja parcelar (pode selecionar múltiplos).</p>
              <p><strong>Passo 3:</strong> Escolha o número de parcelas (máximo 10x).</p>
              <p><strong>Passo 4:</strong> Clique em "Simular" para ver o valor de cada parcela.</p>
              <p><strong>Resultado:</strong> O sistema mostrará:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Valor de cada parcela</li>
                <li>Data de vencimento de cada parcela</li>
                <li>Valor total com juros</li>
              </ul>
            </div>
          </div>

          {/* Seção 4: Emissão de Boleto */}
          <div className="border-l-4 border-purple-600 pl-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              4. Gerando Boleto para Pagamento
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Passo 1:</strong> Após simular, clique em "Gerar Boleto".</p>
              <p><strong>Passo 2:</strong> Confirme as informações do parcelamento.</p>
              <p><strong>Passo 3:</strong> O sistema gerará o DUAM (Documento Único de Arrecadação Municipal).</p>
              <p><strong>Passo 4:</strong> Você pode:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Baixar o boleto em PDF</li>
                <li>Copiar a linha digitável</li>
                <li>Pagar online com cartão ou PIX</li>
              </ul>
              <p><strong>Importante:</strong> Guarde o número do protocolo para consultas futuras.</p>
            </div>
          </div>

          {/* Seção 5: Acompanhamento */}
          <div className="border-l-4 border-orange-600 pl-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-600" />
              5. Acompanhando Pagamentos
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Acesse:</strong> Menu "Status de Pagamentos" (se disponível no sistema).</p>
              <p><strong>Ou:</strong> Volte à página inicial e consulte novamente seus imóveis.</p>
              <p><strong>O sistema mostra:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Pagamentos confirmados</li>
                <li>Pagamentos pendentes</li>
                <li>Histórico completo de pagamentos</li>
              </ul>
              <p><strong>Observação:</strong> O sistema pode levar até 3 dias úteis para confirmar o pagamento após a compensação bancária.</p>
            </div>
          </div>

          {/* Dicas Importantes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              💡 Dicas Importantes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✓ Mantenha seus dados cadastrais atualizados</li>
              <li>✓ Guarde sempre o comprovante de pagamento</li>
              <li>✓ Pague até a data de vencimento para evitar juros e multas</li>
              <li>✓ Em caso de dúvidas, entre em contato com a Prefeitura</li>
              <li>✓ Seus dados são protegidos pela LGPD</li>
            </ul>
          </div>

          {/* Informações de Contato */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              📞 Precisa de Ajuda?
            </h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p><strong>Prefeitura de Araguaína</strong></p>
              <p>Sistema SIG Integração - Consulta Pública</p>
              <p className="mt-3 text-xs text-slate-500">
                Este sistema consulta dados diretamente do banco de dados oficial da Prefeitura de Araguaína.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Entendi, Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}