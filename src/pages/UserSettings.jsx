
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, CreditCard, Save, AlertCircle, CheckCircle, Trash2, Plus, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { municipalApi } from "@/api/municipalClient";
import { createPageUrl } from "@/utils";

export default function UserSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);

  // Estados para o formulário
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    telefone: "",
    cpf_cnpj_padrao: "",
    preferencias_notificacao: {
      email_vencimento: true,
      email_confirmacao: true,
      dias_antecedencia: 7
    }
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await municipalApi.auth.me();
      
      if (!userData) {
        setRequiresLogin(true);
        setErrorMessage("Você precisa estar logado para acessar as configurações");
        setLoading(false);
        return;
      }

      setUser(userData);
      
      setFormData({
        full_name: userData.full_name || "",
        email: userData.email || "",
        telefone: userData.telefone || "",
        cpf_cnpj_padrao: userData.cpf_cnpj_padrao || "",
        preferencias_notificacao: userData.preferencias_notificacao || {
          email_vencimento: true,
          email_confirmacao: true,
          dias_antecedencia: 7
        }
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setRequiresLogin(true);
      setErrorMessage("Você precisa estar logado para acessar as configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await municipalApi.auth.updateMe(formData);
      setSuccessMessage("Configurações salvas com sucesso!");
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setErrorMessage("Erro ao salvar configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    if (!confirm("Deseja realmente remover este método de pagamento?")) return;

    try {
      const metodosFiltrados = (user.metodos_pagamento_salvos || []).filter(m => m.id !== methodId);
      await municipalApi.auth.updateMe({ metodos_pagamento_salvos: metodosFiltrados });
      setSuccessMessage("Método de pagamento removido!");
      loadUserData();
    } catch (error) {
      setErrorMessage("Erro ao remover método de pagamento");
    }
  };

  const clearSearchHistory = async () => {
    if (!confirm("Deseja limpar todo o histórico de buscas?")) return;

    try {
      await municipalApi.auth.updateMe({ historico_buscas: [] });
      setSuccessMessage("Histórico de buscas limpo!");
      loadUserData();
    } catch (error) {
      setErrorMessage("Erro ao limpar histórico");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa estar logado para acessar as configurações da conta.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>
                  Esta área requer autenticação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">
                  As configurações de usuário são apenas para usuários autenticados. 
                  A consulta pública de imóveis está disponível sem login.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl("Home"))}
                    className="flex-1"
                  >
                    Voltar para Consulta Pública
                  </Button>
                  <Button
                    onClick={() => municipalApi.auth.redirectToLogin(window.location.href)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Fazer Login
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Configurações da Conta
          </h1>
          <p className="text-slate-600">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <Alert className="max-w-4xl mx-auto mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="max-w-4xl mx-auto mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="w-4 h-4 mr-2" />
                Pagamentos
              </TabsTrigger>
            </TabsList>

            {/* Tab Perfil */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize seus dados cadastrais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="bg-slate-50"
                      />
                      <p className="text-xs text-slate-500">
                        O e-mail não pode ser alterado
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf_padrao">CPF/CNPJ Padrão para Consultas</Label>
                      <Input
                        id="cpf_padrao"
                        value={formData.cpf_cnpj_padrao}
                        onChange={(e) => setFormData({...formData, cpf_cnpj_padrao: e.target.value})}
                        placeholder="000.000.000-00"
                        maxLength={18}
                      />
                      <p className="text-xs text-slate-500">
                        Será usado automaticamente nas consultas
                      </p>
                    </div>
                  </div>

                  {/* Histórico de Buscas */}
                  {user?.historico_buscas?.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800">Histórico de Buscas Recentes</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSearchHistory}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Limpar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {user.historico_buscas.slice(-5).reverse().map((busca, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{busca.valor}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(busca.data).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Badge variant="outline">{busca.tipo}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <>
                          <Skeleton className="w-4 h-4 mr-2 rounded-full bg-white/50 animate-pulse" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Notificações */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>
                    Configure como e quando deseja ser notificado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="email_vencimento">Alertas de Vencimento</Label>
                        <p className="text-sm text-slate-500">
                          Receba e-mails antes do vencimento dos seus débitos
                        </p>
                      </div>
                      <Switch
                        id="email_vencimento"
                        checked={formData.preferencias_notificacao.email_vencimento}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          preferencias_notificacao: {
                            ...formData.preferencias_notificacao,
                            email_vencimento: checked
                          }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="email_confirmacao">Confirmações de Pagamento</Label>
                        <p className="text-sm text-slate-500">
                          Receba confirmação quando seus pagamentos forem processados
                        </p>
                      </div>
                      <Switch
                        id="email_confirmacao"
                        checked={formData.preferencias_notificacao.email_confirmacao}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          preferencias_notificacao: {
                            ...formData.preferencias_notificacao,
                            email_confirmacao: checked
                          }
                        })}
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Label htmlFor="dias_antecedencia">Dias de Antecedência para Alertas</Label>
                      <p className="text-sm text-slate-500 mb-3">
                        Quantos dias antes do vencimento deseja ser notificado?
                      </p>
                      <Select
                        value={formData.preferencias_notificacao.dias_antecedencia.toString()}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          preferencias_notificacao: {
                            ...formData.preferencias_notificacao,
                            dias_antecedencia: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 dias</SelectItem>
                          <SelectItem value="5">5 dias</SelectItem>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="10">10 dias</SelectItem>
                          <SelectItem value="15">15 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? "Salvando..." : "Salvar Preferências"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Pagamentos */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pagamento</CardTitle>
                  <CardDescription>
                    Gerencie seus cartões e métodos de pagamento salvos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {user?.metodos_pagamento_salvos?.length > 0 ? (
                    <div className="space-y-3">
                      {user.metodos_pagamento_salvos.map((metodo) => (
                        <div
                          key={metodo.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">
                                  {metodo.bandeira || "Cartão"}
                                </p>
                                {metodo.padrao && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                    Padrão
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">
                                •••• •••• •••• {metodo.ultimos_digitos}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePaymentMethod(metodo.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-600 mb-4">
                        Nenhum método de pagamento salvo
                      </p>
                      <p className="text-sm text-slate-500">
                        Os cartões serão salvos automaticamente quando você realizar um pagamento
                      </p>
                    </div>
                  )}

                  <Alert className="bg-blue-50 border-blue-200">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>Segurança:</strong> Suas informações de pagamento são protegidas com criptografia de ponta a ponta. 
                      Não armazenamos dados completos dos cartões.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
