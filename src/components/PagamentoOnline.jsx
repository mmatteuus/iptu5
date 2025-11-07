import React, { useState } from "react";
import { CreditCard, Smartphone, X, Lock, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { municipalApi } from "@/api/municipalClient";

export default function PagamentoOnline({ simulacao, identificacao, onClose, onSuccess }) {
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);

  // Estados para cartão de crédito
  const [dadosCartao, setDadosCartao] = useState({
    numero: "",
    nome: "",
    validade: "",
    cvv: "",
    cpf: "",
    parcelas: 1
  });
  const [salvarCartao, setSalvarCartao] = useState(false);

  const handleProcessarPagamento = async () => {
    setProcessando(true);
    setErro("");

    try {
      const payload = {
        simulacao: simulacao,
        identificacao: identificacao,
        metodo_pagamento: {
          method_id: metodoPagamento,
          doc_type: "CPF",
          doc_number: dadosCartao.cpf.replace(/\D/g, "")
        },
        salvar_cartao: salvarCartao
      };

      // Se for cartão, adiciona dados tokenizados
      if (metodoPagamento === "credit_card") {
        // Aqui seria feita a tokenização via Mercado Pago SDK no frontend
        // Por segurança, nunca enviar dados completos do cartão ao backend
        payload.metodo_pagamento.token = "CARD_TOKEN_FROM_MP_SDK";
        payload.metodo_pagamento.installments = parseInt(dadosCartao.parcelas);
      }

      const { data } = await municipalApi.functions.invoke('processarPagamentoOnline', payload);

      if (data.sucesso || data.status === "approved") {
        setResultado(data);
        if (onSuccess) onSuccess(data);
      } else if (data.status === "pending" || data.status === "in_process") {
        setResultado(data);
      } else {
        setErro(data.status_detail || "Pagamento recusado. Tente outro método.");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      setErro(error.response?.data?.error || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  };

  const copiarQRCode = () => {
    if (resultado?.qr_code) {
      navigator.clipboard.writeText(resultado.qr_code);
      alert("Código PIX copiado!");
    }
  };

  // Resultado do pagamento
  if (resultado) {
    return (
      <div className="space-y-6">
        {resultado.sucesso || resultado.status === "approved" ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Pagamento Aprovado!</strong>
              <br />
              Seu pagamento foi processado com sucesso.
            </AlertDescription>
          </Alert>
        ) : resultado.status === "pending" && resultado.metodo === "pix" ? (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Aguardando Pagamento</strong>
              <br />
              Escaneie o QR Code abaixo para concluir o pagamento via PIX
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pagamento pendente ou recusado. Status: {resultado.status_detail}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">ID do Pagamento</p>
                <p className="font-mono font-semibold text-slate-800">{resultado.pagamento_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Valor</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {resultado.valor?.toFixed(2)}
                </p>
              </div>
            </div>

            {/* QR Code PIX */}
            {resultado.qr_code && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  QR Code PIX
                </p>
                {resultado.qr_code_base64 && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={`data:image/png;base64,${resultado.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-64 h-64 border-2 border-slate-200 rounded-lg"
                    />
                  </div>
                )}
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">Código PIX Copia e Cola:</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                      {resultado.qr_code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copiarQRCode}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {resultado.expiracao && (
                  <p className="text-xs text-slate-500 mt-2">
                    Expira em: {new Date(resultado.expiracao).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            )}

            {/* Comprovante */}
            {resultado.comprovante && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Comprovante
                </p>
                <div className="bg-green-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Data/Hora:</span>
                    <span className="font-semibold">
                      {new Date(resultado.comprovante.data).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {resultado.comprovante.autorizacao && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Autorização:</span>
                      <span className="font-mono font-semibold">
                        {resultado.comprovante.autorizacao}
                      </span>
                    </div>
                  )}
                  {resultado.comprovante.nsu && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">NSU:</span>
                      <span className="font-mono font-semibold">
                        {resultado.comprovante.nsu}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Fechar
              </Button>
              {resultado.sucesso && (
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Imprimir Comprovante
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de pagamento
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pagamento Online</h2>
          <p className="text-sm text-slate-600 mt-1">
            Total: <span className="text-xl font-bold text-green-600">
              R$ {simulacao?.totalGeral?.toFixed(2)}
            </span>
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Pagamento 100% seguro processado via Mercado Pago
        </AlertDescription>
      </Alert>

      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Tabs value={metodoPagamento} onValueChange={setMetodoPagamento}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pix">
            <Smartphone className="w-4 h-4 mr-2" />
            PIX
          </TabsTrigger>
          <TabsTrigger value="credit_card">
            <CreditCard className="w-4 h-4 mr-2" />
            Cartão de Crédito
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix">
          <Card>
            <CardHeader>
              <CardTitle>Pagamento via PIX</CardTitle>
              <CardDescription>
                Rápido, seguro e sem taxas adicionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf_pix">CPF do Pagador</Label>
                <Input
                  id="cpf_pix"
                  placeholder="000.000.000-00"
                  value={dadosCartao.cpf}
                  onChange={(e) => setDadosCartao({...dadosCartao, cpf: e.target.value})}
                  maxLength={14}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <p className="font-semibold text-slate-700">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Clique em "Gerar QR Code PIX"</li>
                  <li>Escaneie o código com seu app bancário</li>
                  <li>Confirme o pagamento</li>
                  <li>Aguarde a confirmação (instantânea)</li>
                </ol>
              </div>

              <Button
                onClick={handleProcessarPagamento}
                disabled={processando || !dadosCartao.cpf}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {processando ? (
                  <>
                    <Skeleton className="w-4 h-4 mr-2 rounded-full bg-white/50 animate-pulse" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Gerar QR Code PIX
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit_card">
          <Card>
            <CardHeader>
              <CardTitle>Pagamento com Cartão de Crédito</CardTitle>
              <CardDescription>
                Parcele em até 12x sem juros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numero_cartao">Número do Cartão</Label>
                <Input
                  id="numero_cartao"
                  placeholder="0000 0000 0000 0000"
                  value={dadosCartao.numero}
                  onChange={(e) => setDadosCartao({...dadosCartao, numero: e.target.value})}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_cartao">Nome no Cartão</Label>
                <Input
                  id="nome_cartao"
                  placeholder="Nome como está no cartão"
                  value={dadosCartao.nome}
                  onChange={(e) => setDadosCartao({...dadosCartao, nome: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="validade">Validade</Label>
                  <Input
                    id="validade"
                    placeholder="MM/AA"
                    value={dadosCartao.validade}
                    onChange={(e) => setDadosCartao({...dadosCartao, validade: e.target.value})}
                    maxLength={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="000"
                    value={dadosCartao.cvv}
                    onChange={(e) => setDadosCartao({...dadosCartao, cvv: e.target.value})}
                    maxLength={4}
                    type="password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_cartao">CPF do Titular</Label>
                <Input
                  id="cpf_cartao"
                  placeholder="000.000.000-00"
                  value={dadosCartao.cpf}
                  onChange={(e) => setDadosCartao({...dadosCartao, cpf: e.target.value})}
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas</Label>
                <RadioGroup
                  value={dadosCartao.parcelas.toString()}
                  onValueChange={(value) => setDadosCartao({...dadosCartao, parcelas: parseInt(value)})}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 6, 12].map((p) => {
                      const valorParcela = simulacao?.totalGeral / p;
                      return (
                        <div key={p} className="flex items-center space-x-2 border rounded-lg p-3">
                          <RadioGroupItem value={p.toString()} id={`parcela-${p}`} />
                          <Label htmlFor={`parcela-${p}`} className="flex-1 cursor-pointer">
                            <div>
                              <span className="font-semibold">{p}x</span>
                              <span className="text-sm text-slate-600"> de</span>
                            </div>
                            <div className="text-sm font-semibold text-green-600">
                              R$ {valorParcela.toFixed(2)}
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="salvar_cartao">Salvar este cartão</Label>
                  <p className="text-xs text-slate-500">
                    Para pagamentos futuros mais rápidos
                  </p>
                </div>
                <Switch
                  id="salvar_cartao"
                  checked={salvarCartao}
                  onCheckedChange={setSalvarCartao}
                />
              </div>

              <Button
                onClick={handleProcessarPagamento}
                disabled={processando || !dadosCartao.numero || !dadosCartao.cpf}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {processando ? (
                  <>
                    <Skeleton className="w-4 h-4 mr-2 rounded-full bg-white/50 animate-pulse" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pagar R$ {simulacao?.totalGeral?.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                Seus dados estão protegidos com criptografia SSL
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}