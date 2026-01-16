// ==============================================
// CONFIGURAÇÕES GLOBAIS
// ==============================================
const API_URL = "http://127.0.0.1:5000";

// ==============================================
// PARTE 1: PREDIÇÃO DE CHURN
// ==============================================
const Prediction = {
    // Features do modelo
    FEATURES: [
        "QTD_SOL_LAST_30D",
        "DAYS_SINCE_LAST",
        "N_UNIQUE_DATES",
        "QTD_REGISTROS_CLIENTE",
        "JA_TENTOU_CANCELAR_max",
        "QTD_FINANCEIRO_mean",
        "QTD_SUPORTE_TECNICO_mean",
        "QTD_OUTROS_mean",
        "QTD_ADMINISTRATIVO_mean",
        "TAXA_CONTATO_DIA"
    ],

salvarNoHistoricoReal: async function(event) {
        console.log("salvarNoHistoricoReal chamada");
        
        // Bloqueio COMPLETO do comportamento padrão para evitar refresh
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            
            // Prevenir comportamento padrão do botão se ele ainda for submit
            const btn = event.target;
            if (btn && btn.type === 'submit') {
                btn.type = 'button';
            }
        }

        // Também prevenir comportamento padrão globalmente
        if (window.event) {
            window.event.preventDefault();
            window.event.returnValue = false;
        }

        const idCliente = document.getElementById('ID_CLIENTE').value;
        if (!idCliente || idCliente.trim() === '') {
            this.showNotification("Por favor, busque um cliente ou insira um ID antes de salvar.", "error");
            return false;
        }

        // Verificar se há dados de resultado
        const resultadoElemento = document.getElementById('resultValue');
        const resultado = resultadoElemento ? resultadoElemento.textContent : "0%";
        
        if (resultado === "0%" || !resultadoElemento || resultadoElemento.style.display === 'none') {
            this.showNotification("Execute uma análise primeiro para salvar no histórico.", "warning");
            return false;
        }

        // Coleta todas as 10 features + ID e Resultado
        const dadosParaSalvar = {
            "ID_CLIENTE": idCliente,
            "QTD_SOL_LAST_30D": document.getElementById('QTD_SOL_LAST_30D').value || 0,
            "DAYS_SINCE_LAST": document.getElementById('DAYS_SINCE_LAST').value || 0,
            "N_UNIQUE_DATES": document.getElementById('N_UNIQUE_DATES').value || 0,
            "QTD_REGISTROS_CLIENTE": document.getElementById('QTD_REGISTROS_CLIENTE').value || 0,
            "JA_TENTOU_CANCELAR_max": document.getElementById('JA_TENTOU_CANCELAR_max').value || 0,
            "QTD_FINANCEIRO_mean": document.getElementById('QTD_FINANCEIRO_mean').value || 0,
            "QTD_SUPORTE_TECNICO_mean": document.getElementById('QTD_SUPORTE_TECNICO_mean').value || 0,
            "QTD_OUTROS_mean": document.getElementById('QTD_OUTROS_mean').value || 0,
            "QTD_ADMINISTRATIVO_mean": document.getElementById('QTD_ADMINISTRATIVO_mean').value || 0,
            "TAXA_CONTATO_DIA": document.getElementById('TAXA_CONTATO_DIA').value || 0,
            "RISCO_PREDITO": resultado,
            "DATA_HORA": new Date().toISOString()
        };
        
        console.log("Dados para salvar:", dadosParaSalvar);
        
        try {
            // Feedback visual ANTES da requisição
            const btn = document.getElementById('salvarCsvBtn');
            const originalHTML = btn.innerHTML;
            const originalBg = btn.style.backgroundColor;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btn.style.backgroundColor = '#f59e0b';
            btn.disabled = true;
            
            const response = await fetch(`${API_URL}/salvar_historico`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dadosParaSalvar)
            });

            console.log("Resposta do servidor:", response.status, response.statusText);
            
            if (response.ok) {
                // Feedback visual de sucesso
                btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                btn.style.backgroundColor = '#10b981';
                
                // Atualizar histórico local
                const risco = this.determinarRisco(resultado);
                this.addToHistory({
                    id_cliente: idCliente,
                    percentual: resultado.replace('%', ''),
                    risco: risco,
                    data_hora: new Date().toLocaleString("pt-BR")
                });
                
                this.showNotification(`Cliente ${idCliente} salvo no histórico!`, "success");
                
                // Restaurar botão após 2 segundos
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.backgroundColor = originalBg;
                    btn.disabled = false;
                }, 2000);
                
            } else {
                const errorText = await response.text();
                console.error("Erro na resposta:", errorText);
                
                // Feedback visual de erro
                btn.innerHTML = '<i class="fas fa-times"></i> Erro!';
                btn.style.backgroundColor = '#ef4444';
                
                this.showNotification("Erro ao salvar no histórico: " + (errorText || "Servidor retornou erro"), "error");
                
                // Restaurar botão após 3 segundos
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.backgroundColor = originalBg;
                    btn.disabled = false;
                }, 3000);
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            
            // Feedback visual de erro de conexão
            const btn = document.getElementById('salvarCsvBtn');
            btn.innerHTML = '<i class="fas fa-times"></i> Falha!';
            btn.style.backgroundColor = '#ef4444';
            
            this.showNotification("Erro ao conectar com o servidor. Verifique se a API está rodando.", "error");
            
            // Restaurar botão após 3 segundos
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar no Histórico';
                btn.style.backgroundColor = '#007bff'; // Padronizado para o azul novo
                btn.disabled = false;
            }, 3000);
        }
        
        // IMPORTANTE: Retornar false para prevenir qualquer comportamento padrão final do navegador
        return false;
    },
    
    determinarRisco: function(probabilidade) {
        const probNum = parseFloat(probabilidade.replace('%', ''));
        if (probNum >= 60) return 'ALTO';
        if (probNum >= 30) return 'MODERADO';
        return 'BAIXO';
    },

    // Configurações do EmailJS
    EMAIL_CONFIG: {
        SERVICE_ID: 'service_8jkqedj',
        TEMPLATE_ID: 'template_sxjadnb',
        PUBLIC_KEY: 'enFcvcOKVblevW8xP',
        TO_EMAIL: 'lucasmds2026@gmail.com'
    },

    // ==================== FUNÇÕES AUXILIARES ====================
    normalize: function(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === "number") return value;

        let v = value;
        if (typeof v === "string") {
            v = v.trim().replace(",", ".");
            if (v === "") return 0;
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        }

        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    },

    // ==================== NOTIFICAÇÕES ====================
    ensureToastContainer: function() {
        let container = document.getElementById("notifications");
        if (container) return container;

        container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.style.position = "fixed";
            container.style.right = "16px";
            container.style.bottom = "16px";
            container.style.zIndex = "99999";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "10px";
            document.body.appendChild(container);
        }
        return container;
    },

    showNotification: function(message, type = "info") {
        const container = this.ensureToastContainer();
        if (!container) return;

        const div = document.createElement("div");
        div.className = `notification ${type}`;
        div.textContent = message;

        // Estilo mínimo
        div.style.padding = "10px 12px";
        div.style.borderRadius = "12px";
        div.style.fontSize = "13px";
        div.style.maxWidth = "360px";
        div.style.boxShadow = "0 10px 24px rgba(0,0,0,.12)";
        div.style.border = "1px solid rgba(255,255,255,.12)";
        div.style.backdropFilter = "blur(8px)";
        div.style.background = "rgba(17,24,39,.92)";
        div.style.color = "#fff";

        if (type === "success") div.style.background = "rgba(16,185,129,.92)";
        if (type === "error") div.style.background = "rgba(239,68,68,.92)";
        if (type === "warning") div.style.background = "rgba(245,158,11,.92)";

        container.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "0";
            div.style.transform = "translateY(8px)";
            div.style.transition = "all .25s ease";
            setTimeout(() => div.remove(), 260);
        }, 3000);
    },

    showHighRiskAlert: function() {
        const el = document.getElementById("alertNotification");
        if (!el) return;
        el.classList.remove("hidden");

        const audio = document.getElementById("alertSound");
        if (audio && typeof audio.play === "function") {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    },

    // ==================== EMAIL ====================
    enviarAlertaEmail: async function(payload) {
        try {
            if (typeof emailjs === "undefined") {
                await new Promise((resolve, reject) => {
                    const s = document.createElement("script");
                    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            }

            if (!window.__emailjs_inited__) {
                emailjs.init(this.EMAIL_CONFIG.PUBLIC_KEY);
                window.__emailjs_inited__ = true;
            }

            const params = {
                to_email: this.EMAIL_CONFIG.TO_EMAIL,
                id_cliente: payload.id_cliente || "-",
                risco: payload.nivel_risco || "-",
                percentual: payload.percentual_churn != null ? `${payload.percentual_churn}%` : "-",
                data_hora: new Date().toLocaleString("pt-BR")
            };

            await emailjs.send(
                this.EMAIL_CONFIG.SERVICE_ID,
                this.EMAIL_CONFIG.TEMPLATE_ID,
                params
            );

            this.showNotification("Alerta por e-mail enviado com sucesso.", "success");
        } catch (err) {
            console.error(err);
            this.showNotification("Falha ao enviar alerta por e-mail.", "error");
        }
    },

    // ==================== FUNÇÕES DE API ====================
    predictChurn: async function(featuresObj) {
        const res = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(featuresObj)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro no /predict");
        return data;
    },

    buscarClientePorId: async function(idCliente) {
        const res = await fetch(`${API_URL}/cliente/${encodeURIComponent(idCliente)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro no /cliente/<id>");
        return data;
    },

    atualizarTemporalCliente: async function(idCliente) {
        try {
            console.log("Atualizando dados temporais para cliente:", idCliente);
            
            const response = await fetch(`${API_URL}/atualizar_temporal/${encodeURIComponent(idCliente)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("Endpoint de atualização não encontrado, fazendo atualização manual...");
                    throw new Error("Endpoint não encontrado");
                }
                const errorData = await response.json();
                throw new Error(errorData?.error || "Erro na atualização temporal");
            }
            
            const dadosAtualizados = await response.json();
            console.log("Dados atualizados da API:", dadosAtualizados);
            return dadosAtualizados;
            
        } catch (e) {
            console.error("Erro na API, fazendo atualização manual:", e);
            
            // Atualização manual quando a API falha
            const dadosAtualizados = {
                "DAYS_SINCE_LAST": 0, // Hoje = 0 dias desde último contato
                "QTD_SOL_LAST_30D": Math.max(0, this.getInputValue("QTD_SOL_LAST_30D") - 1), // Reduz solicitações antigas
                "N_UNIQUE_DATES": this.getInputValue("N_UNIQUE_DATES") + 1,
                "QTD_REGISTROS_CLIENTE": this.getInputValue("QTD_REGISTROS_CLIENTE") + 1,
                "TAXA_CONTATO_DIA": this.calcularTaxaContato()
            };
            
            console.log("Dados atualizados manualmente:", dadosAtualizados);
            return dadosAtualizados;
        }
    },

    calcularTaxaContato: function() {
        const diasUnicos = this.getInputValue("N_UNIQUE_DATES");
        const totalRegistros = this.getInputValue("QTD_REGISTROS_CLIENTE");
        
        if (diasUnicos > 0) {
            return parseFloat((totalRegistros / diasUnicos).toFixed(2));
        }
        return 0;
    },

    // ==================== MANIPULAÇÃO DE UI ====================
    setInputValue: function(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        
        // Formatar número para exibição limpa
        if (typeof value === 'number') {
            // Se for inteiro, mostrar sem casas decimais
            if (Number.isInteger(value)) {
                el.value = value;
            } else {
                // Se for decimal, mostrar com 2 casas
                el.value = parseFloat(value.toFixed(2));
            }
        } else {
            el.value = value;
        }
    },

    getInputValue: function(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        return this.normalize(el.value);
    },

    preencherCampos: function(featuresObj) {
        this.FEATURES.forEach((f) => {
            this.setInputValue(f, featuresObj[f] ?? 0);
        });
    },

    setRiskBadge: function(badgeEl, risco) {
        if (!badgeEl) return;

        badgeEl.textContent = risco;
        badgeEl.classList.remove("low", "moderado", "moderate", "alto", "high", "baixa", "media", "alta");

        const r = String(risco || "").toUpperCase();
        if (r === "ALTO") badgeEl.classList.add("alto");
        else if (r === "MODERADO") badgeEl.classList.add("moderado");
        else badgeEl.classList.add("low");
    },

    renderRecommendations: function(risco) {
        const wrap = document.getElementById("resultDetails");
        const list = document.getElementById("recommendations");
        if (!wrap || !list) return;

        const r = String(risco || "").toUpperCase();
        const items = r === "ALTO" ? [
            "Priorizar retenção: contato ativo em até 24h.",
            "Oferecer condição de permanência (plano/benefício).",
            "Mapear motivo de churn (financeiro, suporte, administrativo)."
        ] : r === "MODERADO" ? [
            "Contato preventivo e acompanhamento.",
            "Checar qualidade do suporte e histórico recente.",
            "Segmentar por perfil/plano/região para ação direcionada."
        ] : [
            "Manter acompanhamento normal.",
            "Monitorar variações de contato e solicitações.",
            "Reforçar relacionamento sem intervenção agressiva."
        ];

        list.innerHTML = items.map(t => `<div style="padding:10px 12px; border:1px solid var(--line); border-radius:12px; margin-bottom:8px;">${t}</div>`).join("");
        wrap.style.display = "block";
    },

    renderResult: function(data) {
        const container = document.getElementById("resultContainer");
        const valueEl = document.getElementById("resultValue");
        const badgeEl = document.getElementById("riskBadge");

        if (container) container.style.display = "block";
        if (valueEl) valueEl.textContent = `${data.percentual_churn}%`;
        this.setRiskBadge(badgeEl, data.nivel_risco);
        this.renderRecommendations(data.nivel_risco);
    },

    // ==================== HISTÓRICO ====================
    getHistory: function() {
        try {
            return JSON.parse(localStorage.getItem("churn_history") || "[]");
        } catch {
            return [];
        }
    },

    saveHistory: function(arr) {
        localStorage.setItem("churn_history", JSON.stringify(arr));
    },

    addToHistory: function(entry) {
        const hist = this.getHistory();
        hist.unshift(entry);
        this.saveHistory(hist);
        this.renderHistory();
        this.atualizarEstatisticasHistoricoSafe();
    },

    atualizarEstatisticasHistoricoSafe: function() {
        if (typeof window.atualizarEstatisticasHistorico === "function") {
            window.atualizarEstatisticasHistorico();
        }
    },

    renderHistory: function() {
        const list = document.getElementById("historyList");
        if (!list) return;

        const hist = this.getHistory();
        if (!hist.length) {
            list.innerHTML = `
                <div style="opacity:.7; text-align:center; padding: 22px 10px;">
                    <i class="fas fa-clock" style="font-size: 26px; opacity:.6;"></i>
                    <div style="margin-top:10px;">Nenhuma análise realizada ainda.</div>
                    <div style="font-size:12px; opacity:.7; margin-top:6px;">As análises aparecerão aqui automaticamente.</div>
                </div>
            `;
            return;
        }

        list.innerHTML = hist.slice(0, 30).map(item => {
            const risco = String(item.risco || "").toUpperCase();
            const badge = risco === "ALTO" ? "rgba(239,68,68,.16)" :
                        risco === "MODERADO" ? "rgba(245,158,11,.16)" :
                        "rgba(16,185,129,.16)";

            return `
                <div style="border:1px solid var(--line); border-radius:14px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                        <div>
                            <div style="font-weight:700; font-size:13px;">Cliente: ${item.id_cliente || "-"}</div>
                            <div style="font-size:12px; opacity:.75; margin-top:2px;">${item.data_hora || ""}</div>
                        </div>
                        <div style="padding:6px 10px; border-radius:999px; background:${badge}; font-size:12px; font-weight:700;">
                            ${risco || "-"}
                        </div>
                    </div>
                    <div style="margin-top:10px; font-size:12px; opacity:.9;">
                        Probabilidade: <b>${item.percentual ?? "-"}%</b>
                    </div>
                </div>
            `;
        }).join("");
    },

    limparHistorico: function() {
        localStorage.removeItem("churn_history");
        this.renderHistory();
        this.atualizarEstatisticasHistoricoSafe();
        this.showNotification("Histórico limpo.", "success");
    },

    // ==================== HANDLERS PRINCIPAIS ====================
    buscarCliente: async function() {
    try {
        const id = document.getElementById("ID_CLIENTE")?.value?.trim();
        if (!id) {
            this.showNotification("Informe o ID do cliente.", "error");
            return;
        }

        this.showNotification("Buscando cliente no base_clientes.csv...", "info");
        const dados = await this.buscarClientePorId(id);
        
        // VERIFICAÇÃO: Se DAYS_SINCE_LAST >= 365, ZERA TODOS OS CAMPOS
        const daysSinceLast = dados.DAYS_SINCE_LAST || 0;
        if (daysSinceLast >= 365) {
            this.showNotification(`Cliente sem contato há ${daysSinceLast} dias. Zerando todas as features...`, "warning");
            
            // Criar um objeto com todas as features zeradas
            const dadosZerados = {};
            this.FEATURES.forEach(f => {
                dadosZerados[f] = 0;
            });
            
            // Manter apenas o ID do cliente
            dadosZerados.ID_CLIENTE = id;
            
            this.preencherCampos(dadosZerados);
            this.showNotification(`Todas as features foram zeradas (inativo há ${daysSinceLast} dias).`, "success");
        } else {
            // Se não for inativo há 365+ dias, preenche normalmente
            this.preencherCampos(dados);
            this.showNotification("Campos preenchidos com sucesso.", "success");
        }
    } catch (e) {
        console.error(e);
        this.showNotification(e.message || "Erro ao buscar cliente.", "error");
    }
},

    atualizarDadosParaHoje: async function() {
        const idCliente = document.getElementById('ID_CLIENTE').value;
        if (!idCliente) {
            this.showNotification("Busque um cliente primeiro", "error");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/atualizar_temporal/${idCliente}`);
            const dados = await res.json();

            if (dados.error) throw new Error(dados.error);

            // ATUALIZAÇÃO RESTRITA AOS DOIS CAMPOS CONFORME PEDIDO
            const campoDias = document.getElementById('DAYS_SINCE_LAST');
            const campoSol = document.getElementById('QTD_SOL_LAST_30D');

            if (campoDias) {
                campoDias.value = dados.DAYS_SINCE_LAST;
                campoDias.classList.add('updated-highlight'); // Opcional: destaque visual
            }

            if (campoSol) {
                campoSol.value = dados.QTD_SOL_LAST_30D;
                campoSol.classList.add('updated-highlight');
            }

            // Removendo qualquer lógica que mexa nos outros 8 campos
            
            this.showNotification(`Dados atualizados partindo de 31/10/2025`, "success");

            setTimeout(() => {
                if(campoDias) campoDias.classList.remove('updated-highlight');
                if(campoSol) campoSol.classList.remove('updated-highlight');
            }, 2000);

        } catch (e) {
            console.error(e);
            this.showNotification("Erro ao processar atualização temporal", "error");
        }
    },

    simularCorrecaoDataLocal: function() {
        // Lógica local para "corrigir data"
        const diasDesdeUltimo = 0; // Hoje
        const solicitacoes30D = Math.max(0, this.getInputValue("QTD_SOL_LAST_30D") - 1); // Reduz solicitações antigas
        const diasUnicos = this.getInputValue("N_UNIQUE_DATES") + 1;
        const totalRegistros = this.getInputValue("QTD_REGISTROS_CLIENTE") + 1;
        
        // Calcular nova taxa
        let taxaContatoDia = 0;
        if (diasUnicos > 0) {
            taxaContatoDia = parseFloat((totalRegistros / diasUnicos).toFixed(2));
        }
        
        this.setInputValue("DAYS_SINCE_LAST", diasDesdeUltimo);
        this.setInputValue("QTD_SOL_LAST_30D", solicitacoes30D);
        this.setInputValue("N_UNIQUE_DATES", diasUnicos);
        this.setInputValue("QTD_REGISTROS_CLIENTE", totalRegistros);
        this.setInputValue("TAXA_CONTATO_DIA", taxaContatoDia);
        
        this.showNotification("Correção de data aplicada (modo local).", "success");
    },

    simularContatoHoje: function(event) {
    if (event) event.preventDefault();

    // 1. ZERAR Último contato (dias) - NOVO
    const campoDiasUltimo = document.getElementById('DAYS_SINCE_LAST');
    campoDiasUltimo.value = 0;

    // 2. Campo: Quantidade de Contatos por Dia (TAXA_CONTATO_DIA) -> Soma +1 (INTEIRO)
    const campoTaxa = document.getElementById('TAXA_CONTATO_DIA');
    let taxaAtual = parseInt(campoTaxa.value) || 0;
    campoTaxa.value = taxaAtual + 1;

    // 3. Campo: Total registros (QTD_REGISTROS_CLIENTE) -> Soma +1
    const campoTotal = document.getElementById('QTD_REGISTROS_CLIENTE');
    let totalAtual = parseInt(campoTotal.value) || 0;
    campoTotal.value = totalAtual + 1;

    // 4. Campo: Dias únicos interação (N_UNIQUE_DATES) -> Soma +1
    const campoDiasUnicos = document.getElementById('N_UNIQUE_DATES');
    let diasUnicosAtual = parseInt(campoDiasUnicos.value) || 0;
    campoDiasUnicos.value = diasUnicosAtual + 1;

    // 5. Campo: Solicitações (30 dias) (QTD_SOL_LAST_30D)
    // Lógica mantida: Se estiver zerado vira 1, se tiver valor soma +1.
    const campoSol30 = document.getElementById('QTD_SOL_LAST_30D');
    let sol30Atual = parseInt(campoSol30.value) || 0;
    
    if (sol30Atual <= 0) {
        campoSol30.value = 1;
    } else {
        campoSol30.value = sol30Atual + 1;
    }

    console.log("Simulação de atendimento concluída: Campos atualizados como inteiros.");
},
    
    showNotificationHTML: function(htmlContent, type = "info") {
        const container = this.ensureToastContainer();
        if (!container) return;

        const div = document.createElement("div");
        div.className = `notification ${type}`;
        div.innerHTML = htmlContent;

        // Estilo mínimo
        div.style.padding = "12px 14px";
        div.style.borderRadius = "12px";
        div.style.fontSize = "13px";
        div.style.maxWidth = "380px";
        div.style.boxShadow = "0 10px 24px rgba(0,0,0,.12)";
        div.style.border = "1px solid rgba(255,255,255,.12)";
        div.style.backdropFilter = "blur(8px)";
        div.style.background = "rgba(17,24,39,.92)";
        div.style.color = "#fff";

        if (type === "success") div.style.background = "rgba(16,185,129,.92)";
        if (type === "error") div.style.background = "rgba(239,68,68,.92)";
        if (type === "warning") div.style.background = "rgba(245,158,11,.92)";

        container.appendChild(div);

        setTimeout(() => {
            div.style.opacity = "0";
            div.style.transform = "translateY(8px)";
            div.style.transition = "all .25s ease";
            setTimeout(() => div.remove(), 260);
        }, 4000); // Mais tempo para ler a mensagem detalhada
    },

    analyzeChurn: async function() {
        try {
            const id = document.getElementById("ID_CLIENTE")?.value?.trim() || null;
            const featuresObj = {};
            this.FEATURES.forEach((f) => (featuresObj[f] = this.getInputValue(f)));

            this.showNotification("Gerando previsão...", "info");
            const result = await this.predictChurn(featuresObj);
            this.renderResult(result);

            // Adicionar ao histórico
            this.addToHistory({
                id_cliente: id,
                percentual: result.percentual_churn,
                risco: result.nivel_risco,
                data_hora: new Date().toLocaleString("pt-BR")
            });

            // Se alto risco, alerta visual + email
            if (String(result.nivel_risco).toUpperCase() === "ALTO") {
                this.showHighRiskAlert();
                await this.enviarAlertaEmail({
                    id_cliente: id,
                    ...result
                });
            }

            this.showNotification("Previsão concluída.", "success");
        } catch (e) {
            console.error(e);
            this.showNotification(e.message || "Erro ao prever churn.", "error");
        }
    }
};

// ==============================================
// PARTE 2: DASHBOARD ANALÍTICO
// ==============================================
const Dashboard = {
    // Configurações
    XLSX_URL: "../datasetdashboard.xlsx",
    XLSX_FALLBACK_URLS: [
        "../datasetdashboard.xlsx",
        "datasetdashboard.xlsx"
    ],

    // Estado
    dataCache: null,
    filteredData: null,
    charts: {},

    // ==================== INICIALIZAÇÃO ====================
    loadExternalScript: function(src) {
        return new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).some(s => s.src && s.src.includes(src));
            if (existing) return resolve();

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    ensureLibs: async function() {
        if (typeof XLSX === "undefined") {
            await this.loadExternalScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
        }
        if (typeof Chart === "undefined") {
            await this.loadExternalScript("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js");
        }
    },

    // ==================== FUNÇÕES AUXILIARES ====================
    toNumber: function(v) {
        if (v === null || v === undefined) return 0;
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        const s = String(v).trim().replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    },

    toText: function(v) {
        if (v === null || v === undefined) return "";
        // REMOVA o .toUpperCase() daqui
        return String(v).trim(); 
    },

    normalizeChurnValue: function(v) {
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "1" || s === "true" || s === "sim" || s === "churn" || s === "cancelou" || s === "yes") return 1;
        if (s === "0" || s === "false" || s === "nao" || s === "não" || s === "no churn" || s === "ativo" || s === "no") return 0;
        const n = this.toNumber(v);
        return n >= 1 ? 1 : 0;
    },

    pick: function(obj, keys, fallback = null) {
        for (const k of keys) {
            if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
                return obj[k];
            }
        }
        return fallback;
    },

    parseDateMaybe: function(v) {
        if (!v) return null;
        if (typeof v === "number") {
            try {
                if (typeof XLSX !== "undefined" && XLSX.SSF && typeof XLSX.SSF.parse_date_code === "function") {
                    const d = XLSX.SSF.parse_date_code(v);
                    if (d && d.y && d.m && d.d) return new Date(d.y, d.m - 1, d.d);
                }
            } catch {}
        }

        const s = String(v).trim();
        if (!s) return null;

        const iso = new Date(s);
        if (!isNaN(iso.getTime())) return iso;

        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (m) {
            const dd = Number(m[1]);
            const mm = Number(m[2]) - 1;
            const yy = Number(m[3].length === 2 ? ("20" + m[3]) : m[3]);
            const d = new Date(yy, mm, dd);
            if (!isNaN(d.getTime())) return d;
        }

        return null;
    },

    sanitizeRows: function(rows) {
        if (!Array.isArray(rows)) return [];

        return rows.map(r => {
            const churnRaw = this.pick(r, ["CHURN", "Churn", "churn", "TARGET", "target", "SAIU", "Saiu", "saida"], 0);
            const churn = this.normalizeChurnValue(churnRaw);

            const genero = this.pick(r, ["GENERO", "GÊNERO", "Gender", "gender", "SEXO", "Sexo"], "Indefinido");
            const servico = this.pick(r, ["SERVICO", "SERVIÇO", "Contract", "contract", "PLANO", "Plano", "Service", "service"], "Indefinido");
            const cidade = this.pick(r, ["CIDADE", "Cidade", "city", "CITY", "REGIAO", "REGIÃO", "Region", "region"], "Indefinido");
            const canal = this.pick(r, ["CANAL", "Canal", "Channel", "channel", "ORIGEM", "origem"], "Indefinido");

            const meses = this.toNumber(this.pick(r, ["MESES", "TENURE", "tenure", "Tempo", "tempo", "CONTRATO_IDADE"], 0));
            const dataRaw = this.pick(r, ["DATA", "Data", "date", "DATE", "DT", "dt", "DIA", "Dia"], null);
            const dataObj = this.parseDateMaybe(dataRaw);
            const receita = this.toNumber(this.pick(r, ["RECEITA", "Revenue", "revenue", "VALOR", "valor", "FATURAMENTO", "faturamento", "TICKET", "ticket"], 0));
            const solicitacoes = this.toNumber(this.pick(r, ["SOLICITACOES", "SOLICITAÇÕES", "Requests", "requests", "QTD_SOL", "QTD_SOL_LAST_30D"], 0));

            return {
                ...r,
                CHURN: churn,
                GENERO: this.toText(genero) || "Indefinido",
                SERVICO: this.toText(servico) || "Indefinido",
                CIDADE: this.toText(cidade) || "Indefinido",
                CANAL: this.toText(canal) || "Indefinido",
                MESES: meses,
                __DATE: dataObj,
                __RECEITA: receita,
                __SOL: solicitacoes
            };
        });
    },

    // ==================== CARREGAMENTO DE DADOS ====================
    fetchXlsxAsArrayBuffer: async function(url) {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`Não consegui carregar o datasetdashboard.xlsx. URL: ${url} | Status: ${res.status}`);
        }
        return await res.arrayBuffer();
    },

    fetchXlsxWithFallbacks: async function() {
        const urls = window.DASHBOARD_XLSX_FALLBACK_URLS || this.XLSX_FALLBACK_URLS;
        let lastErr = null;

        for (const u of urls) {
            try {
                return await this.fetchXlsxAsArrayBuffer(u);
            } catch (e) {
                lastErr = e;
            }
        }

        throw new Error("Não consegui carregar o datasetdashboard.xlsx. Verifique o caminho/servidor." + (lastErr ? ` (${lastErr.message})` : ""));
    },

    readDashboardXlsxFromUrl: async function() {
        const url = "datasetdashboard.xlsx"; // Mantemos o nome, mas lemos como texto
        const resp = await fetch(url);
        const text = await resp.text();
        
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            let row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] ? values[i].trim() : "";
            });
            return row;
        });
    },

    // ==================== CÁLCULO DE KPIS ====================
    computeKPIs: function(rows) {
        const total = rows.length;
        const churnCount = rows.reduce((acc, r) => acc + (Number(r.CHURN) === 1 ? 1 : 0), 0);
        const ativoCount = total - churnCount;
        const churnRate = total > 0 ? churnCount / total : 0;
        const somaReceita = rows.reduce((acc, r) => acc + (Number(r.__RECEITA) || 0), 0);
        const ticketMedio = total > 0 ? (somaReceita / total) : 0;
        const somaSol = rows.reduce((acc, r) => acc + (Number(r.__SOL) || 0), 0);

        return { total, churnCount, ativoCount, churnRate, somaReceita, ticketMedio, somaSol };
    },

    formatMoneyBR: function(v) {
        if (!Number.isFinite(v)) return "R$ 0";
        const abs = Math.abs(v);
        if (abs >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
        if (abs >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
        if (abs >= 1e3) return `R$ ${(v / 1e3).toFixed(1)}K`;
        return `R$ ${v.toFixed(2)}`;
    },

    setText: function(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    renderKPIs: function(rows) {
        const k = this.computeKPIs(rows);
        this.setText("dash_filtered_count", String(k.total));
        this.setText("dash_kpi_totalClientes", String(k.total));
        this.setText("dash_kpi_churnRate", `${(k.churnRate * 100).toFixed(1)}%`);
        this.setText("dash_kpi_ticketMedio", this.formatMoneyBR(k.ticketMedio));
        this.setText("dash_kpi_solicitacoes", String(k.somaSol));
        this.setText("dash_total_clientes", String(k.total));
        this.setText("dash_churn_rate", `${(k.churnRate * 100).toFixed(1)}%`);
        this.setText("dash_clientes_churn", String(k.churnCount));
        this.setText("dash_clientes_ativos", String(k.ativoCount));
    },

    // ==================== GRÁFICOS ====================
    destroyChart: function(chart) {
        if (chart && typeof chart.destroy === "function") chart.destroy();
    },

    destroyAllCharts: function() {
        Object.keys(this.charts).forEach(k => {
            this.destroyChart(this.charts[k]);
            this.charts[k] = null;
        });
    },

    groupCounts: function(rows, key) {
        const map = new Map();
        rows.forEach(r => {
            const k = this.toText(r[key] ?? "Indefinido") || "Indefinido";
            const cur = map.get(k) || { total: 0, churn: 0, ativo: 0 };
            cur.total += 1;
            if (Number(r.CHURN) === 1) cur.churn += 1;
            else cur.ativo += 1;
            map.set(k, cur);
        });
        return map;
    },

    topBy: function(map, n = 8, by = "total") {
        const arr = Array.from(map.entries()).map(([k, v]) => ({ k, ...v }));
        arr.sort((a, b) => (b[by] || 0) - (a[by] || 0));
        return arr.slice(0, n);
    },

    buildTimeline: function(rows) {
        const only = rows.filter(r => r.__DATE instanceof Date && !isNaN(r.__DATE.getTime()));
        if (!only.length) return null;

        const map = new Map();
        only.forEach(r => {
            const d = r.__DATE;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const cur = map.get(key) || { total: 0, churn: 0 };
            cur.total += 1;
            if (Number(r.CHURN) === 1) cur.churn += 1;
            map.set(key, cur);
        });

        const keys = Array.from(map.keys()).sort();
        const churnRate = keys.map(k => {
            const v = map.get(k);
            return v.total > 0 ? (v.churn / v.total) * 100 : 0;
        });

        return { labels: keys, churnRate };
    },

    renderCharts: function(rows) {
        this.destroyAllCharts();
        const k = this.computeKPIs(rows);

        // Gráfico 1: Status de Churn
        const c1 = document.getElementById("dash_chart_churnStatus");
        if (c1) {
            this.charts.churnStatus = new Chart(c1, {
                type: "doughnut",
                data: {
                    labels: ["Ativo", "Churn"],
                    datasets: [{ data: [k.ativoCount, k.churnCount] }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } }
                }
            });
        }

    // Gráfico 2: Gênero (Pizza com quantidade dentro)
    const genMap = this.groupCounts(rows, "GENERO");

    // Somando ativo + churn para cada gênero
    const genData = Object.values(genMap).map(v => ({
        genero: v.k,
        total: (v.ativo || 0) + (v.churn || 0)
    }));

    const c2 = document.getElementById("dash_chart_genero");
    if (c2) {

        if (this.charts.genero) {
            this.charts.genero.destroy();
        }

        this.charts.genero = new Chart(c2, {
            type: "pie",
            data: {
                labels: genData.map(x => x.genero),
                datasets: [{
                    data: genData.map(x => x.total),
                    backgroundColor: [
                        "#3b82f6",
                        "#ec4899",
                        "#10b981",
                        "#f59e0b",
                        "#6b7280",
                        "#8b5cf6",
                        "#ef4444"
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom"
                    },
                    datalabels: {
                        color: "#fff",
                        font: {
                            weight: "bold",
                            size: 14
                        },
                        formatter: (value, ctx) => {
                            const total = ctx.chart.data.datasets[0].data
                                .reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${value}\n(${percent}%)`;
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }


        // Gráfico 3: Cidades
        const cidadeMap = this.groupCounts(rows, "CIDADE");
        const cidadeTop = this.topBy(cidadeMap, 10, "churn");
        const c3 = document.getElementById("dash_chart_cidade");
        if (c3) {
            this.charts.cidade = new Chart(c3, {
                type: "bar",
                data: {
                    labels: cidadeTop.map(x => x.k),
                    datasets: [{ label: "Churn", data: cidadeTop.map(x => x.churn) }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } }
                }
            });
        }

        const chart4TypeSelect = document.getElementById('chart4Type');
            if (chart4TypeSelect) {
            chart4TypeSelect.addEventListener('change', () => {
                createTopCitiesChart();
            });
        }


        // Gráfico 4: Canal
        const canalMap = this.groupCounts(rows, "CANAL");
        const canalTop = this.topBy(canalMap, 10, "total");
        const c4 = document.getElementById("dash_chart_canal");
        if (c4) {
            this.charts.canal = new Chart(c4, {
                type: "bar",
                data: {
                    labels: canalTop.map(x => x.k),
                    datasets: [
                        { label: "Ativo", data: canalTop.map(x => x.ativo) },
                        { label: "Churn", data: canalTop.map(x => x.churn) }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } },
                    scales: { x: { stacked: true }, y: { stacked: true } }
                }
            });
        }

        // Gráfico 5: Timeline
        const tl = this.buildTimeline(rows);
        const c5 = document.getElementById("dash_chart_timeline");
        if (c5) {
            if (tl) {
                this.charts.timeline = new Chart(c5, {
                    type: "line",
                    data: {
                        labels: tl.labels,
                        datasets: [{ label: "Churn rate (%)", data: tl.churnRate }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: "bottom" } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            } else {
                this.charts.timeline = new Chart(c5, {
                    type: "line",
                    data: { labels: ["Sem dados de data"], datasets: [{ label: "Churn rate (%)", data: [k.churnRate * 100] }] },
                    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
                });
            }
        }
    },

    // ==================== TABELA ====================
    renderTablePreview: function(rows, limit = 12) {
        const head = document.getElementById("dash_table_head");
        const body = document.getElementById("dash_table_body");
        const tbl = document.getElementById("dash_table");

        if ((!head || !body) && !tbl) return;
        if (!rows.length) {
            if (head) head.innerHTML = "";
            if (body) body.innerHTML = "";
            if (tbl) {
                const h = tbl.querySelector("thead");
                const b = tbl.querySelector("tbody");
                if (h) h.innerHTML = "";
                if (b) b.innerHTML = "";
            }
            return;
        }

        const cols = Object.keys(rows[0]).filter(c => !String(c).startsWith("__")).slice(0, 10);

        if (head && body) {
            head.innerHTML = `<tr>${cols.map(c => `<th style="text-align:left; padding:10px; border-bottom:1px solid var(--line); font-size:12px; opacity:.85;">${c}</th>`).join("")}</tr>`;
            body.innerHTML = rows.slice(0, limit).map(r => {
                return `<tr>${cols.map(c => `<td style="padding:10px; border-bottom:1px solid var(--line); font-size:12px; opacity:.9;">${String(r[c] ?? "")}</td>`).join("")}</tr>`;
            }).join("");
            return;
        }

        if (tbl) {
            const h = tbl.querySelector("thead");
            const b = tbl.querySelector("tbody");
            if (!h || !b) return;

            h.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;
            b.innerHTML = rows.slice(0, limit).map(r => {
                return `<tr>${cols.map(c => `<td>${String(r[c] ?? "")}</td>`).join("")}</tr>`;
            }).join("");
        }
    },

    // ==================== FILTROS ====================
    uniqueSorted: function(rows, key) {
        const set = new Set(rows.map(r => {
            const v = r[key] || "";
            if (v === 'M') return 'Masculino';
            if (v === 'F') return 'Feminino';
            return v;
        }).filter(Boolean));
        
        const arr = Array.from(set);
        arr.sort((a, b) => a.localeCompare(b, "pt-BR"));
        return arr;
    },

    fillSelect: function(selectId, values) {
        const el = document.getElementById(selectId);
        if (!el) return;

        el.innerHTML = "";
        const optAll = document.createElement("option");
        optAll.value = "__ALL__";
        optAll.textContent = "Todos";
        el.appendChild(optAll);

        values.forEach(v => {
            const o = document.createElement("option");
            o.value = v;
            o.textContent = v;
            el.appendChild(o);
        });
    },

    setDateInputsFromData: function(rows) {
        const startEl = document.getElementById("dash_filter_date_start");
        const endEl = document.getElementById("dash_filter_date_end");
        if (!startEl || !endEl) return;

        const dates = rows
            .map(r => r.__DATE)
            .filter(d => d instanceof Date && !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

        if (!dates.length) {
            startEl.value = "";
            endEl.value = "";
            startEl.disabled = true;
            endEl.disabled = true;
            return;
        }

        const min = dates[0];
        const max = dates[dates.length - 1];

        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!startEl.value) startEl.value = fmt(min);
        if (!endEl.value) endEl.value = fmt(max);

        startEl.disabled = false;
        endEl.disabled = false;
    },

    applyFilters: function() {
        if (!Array.isArray(this.dataCache)) return [];

        const startEl = document.getElementById("dash_filter_date_start");
        const endEl = document.getElementById("dash_filter_date_end");
        const servEl = document.getElementById("dash_filter_servico");
        const cidEl = document.getElementById("dash_filter_cidade");
        const genEl = document.getElementById("dash_filter_genero");
        const canEl = document.getElementById("dash_filter_canal");

        const serv = servEl ? servEl.value : "__ALL__";
        const cid = cidEl ? cidEl.value : "__ALL__";
        const gen = genEl ? genEl.value : "__ALL__";
        const can = canEl ? canEl.value : "__ALL__";

        let start = null, end = null;
        if (startEl && !startEl.disabled && startEl.value) start = new Date(startEl.value + "T00:00:00");
        if (endEl && !endEl.disabled && endEl.value) end = new Date(endEl.value + "T23:59:59");

        return this.dataCache.filter(r => {
            // Mapeando para as colunas do seu novo formato
            const vServ = r.SERVICO;
            const vCid  = r.CIDADE_x; // Ajustado
            const vGen  = r.GENERO;
            const vCan  = r.CANAL;

            if (serv !== "__ALL__" && vServ !== serv) return false;
            if (cid !== "__ALL__" && vCid !== cid) return false;
            if (gen !== "__ALL__" && vGen !== gen) return false;
            if (can !== "__ALL__" && vCan !== can) return false;

            if (start || end) {
                const d = r.__DATE;
                if (!(d instanceof Date) || isNaN(d.getTime())) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
            }

            return true;
        });
    },

    setupFilterListeners: function() {
        const ids = [
            "dash_filter_date_start",
            "dash_filter_date_end",
            "dash_filter_servico",
            "dash_filter_cidade",
            "dash_filter_genero",
            "dash_filter_canal"
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("change", () => {
                this.filteredData = this.applyFilters();
                this.renderKPIs(this.filteredData);
                this.renderCharts(this.filteredData);
                this.renderTablePreview(this.filteredData, 12);
            });
        });
    },

    initUI: function(rows) {
        // Usando os nomes exatos do seu CSV
        this.fillSelect("dash_filter_servico", this.uniqueSorted(rows, "SERVICO"));
        this.fillSelect("dash_filter_cidade", this.uniqueSorted(rows, "CIDADE_x")); // Note o _x
        this.fillSelect("dash_filter_genero", this.uniqueSorted(rows, "GENERO")); 
        this.fillSelect("dash_filter_canal", this.uniqueSorted(rows, "CANAL"));

        this.setDateInputsFromData(rows);
        this.setupFilterListeners();
    },

    // ==================== FUNÇÃO PRINCIPAL ====================
    carregarDataset: async function(forceReload = false) {
        try {
            await this.ensureLibs();

            // Se já tem dados, APENAS DESENHA E PARA
            if (!forceReload && Array.isArray(this.dataCache) && this.dataCache.length > 0) {
                this.initUI(this.dataCache); 
                this.filteredData = this.applyFilters();
                this.renderKPIs(this.filteredData);
                this.renderCharts(this.filteredData);
                this.renderTablePreview(this.filteredData, 12);
                return; 
            }

            Prediction.showNotification("Carregando Dashboard...", "info");

            let rows = await this.readDashboardXlsxFromUrl();
            rows = this.sanitizeRows(rows);
            this.dataCache = rows;

            // Preenche os filtros e desenha tudo
            this.initUI(rows); 
            this.filteredData = this.applyFilters();
            this.renderKPIs(this.filteredData);
            this.renderCharts(this.filteredData);
            this.renderTablePreview(this.filteredData, 12);

            Prediction.showNotification("Dashboard pronto!", "success");
        } catch (e) {
            console.error("Erro no Dashboard:", e);
        }
    },
};



function salvarNoHistoricoCSV() {
    // 1. Coletar os dados atuais dos campos
    const dados = {
        ID_CLIENTE: document.getElementById('ID_CLIENTE').value || 'N/A',
        DATA_SALVAMENTO: new Date().toLocaleString('pt-BR'),
        QTD_SOL_30D: document.getElementById('QTD_SOL_LAST_30D').value,
        DIAS_ULTIMO_CONTATO: document.getElementById('DAYS_SINCE_LAST').value,
        DIAS_INTERACAO: document.getElementById('N_UNIQUE_DATES').value,
        TOTAL_REGISTROS: document.getElementById('QTD_REGISTROS_CLIENTE').value,
        TENTATIVA_CANCELAR: document.getElementById('JA_TENTOU_CANCELAR_max').value,
        FINANCEIRO: document.getElementById('QTD_FINANCEIRO_mean').value,
        SUPORTE: document.getElementById('QTD_SUPORTE_TECNICO_mean').value,
        OUTROS: document.getElementById('QTD_OUTROS_mean').value,
        ADMIN: document.getElementById('QTD_ADMINISTRATIVO_mean').value,
        TAXA_CONTATO: document.getElementById('TAXA_CONTATO_DIA').value,
        PROBABILIDADE_ATUAL: document.getElementById('resultValue').textContent || 'Não analisado'
    };
};

// ==============================================
// INICIALIZAÇÃO E EXPOSIÇÃO PARA WINDOW
// ==============================================
document.addEventListener("DOMContentLoaded", () => {
    // Inicializar histórico da predição
    Prediction.renderHistory();
    Prediction.atualizarEstatisticasHistoricoSafe();
    
    // Prevenir submit acidental em qualquer formulário
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    });
    
    // Garantir que botões não causem submit
    document.querySelectorAll('button').forEach(btn => {
        if (btn.type === 'submit') {
            btn.type = 'button';
        }
    });
});

// Expor funções para uso no HTML
window.buscarCliente = Prediction.buscarCliente.bind(Prediction);
window.atualizarDadosParaHoje = Prediction.atualizarDadosParaHoje.bind(Prediction);
window.simularContatoHoje = Prediction.simularContatoHoje.bind(Prediction);
window.analyzeChurn = Prediction.analyzeChurn.bind(Prediction);
window.limparHistorico = Prediction.limparHistorico.bind(Prediction);
window.carregarDashboardDataset = Dashboard.carregarDataset.bind(Dashboard);
window.salvarNoHistoricoReal = Prediction.salvarNoHistoricoReal.bind(Prediction);

// Adicione isso ao final do seu script.js para desativar qualquer 
// comportamento de submit acidental em toda a página
document.addEventListener('submit', function(e) {
    e.preventDefault();
    return false;
}, true);

// Compatibilidade
window.onBuscarCliente = Prediction.buscarCliente.bind(Prediction);
window.onAtualizarTemporal = Prediction.atualizarDadosParaHoje.bind(Prediction);
window.onPrever = Prediction.analyzeChurn.bind(Prediction);
window.DASHBOARD_XLSX_FALLBACK_URLS = Dashboard.XLSX_FALLBACK_URLS;

// Função para abrir abas (se necessário)
window.abrirAba = function(abaId) {
    const abas = document.querySelectorAll("[data-aba]");
    abas.forEach(el => el.classList.add("hidden"));

    const target = document.querySelector(`[data-aba="${abaId}"]`);
    if (target) target.classList.remove("hidden");

    // Gatilho automático
    if (abaId === 'dashboard') {
        Dashboard.carregarDataset();
    }
    
    // Mantém o visual do menu ativo
    document.querySelectorAll(".nav-link").forEach(b => {
        b.classList.remove("active");
        if (b.getAttribute("onclick")?.includes(`'${abaId}'`)) b.classList.add("active");
    });
    // ==============================================
// TOOLTIPS PARA EXPLICAÇÃO DOS CAMPOS
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
  // Adiciona eventos de clique nos ícones de informação
  document.querySelectorAll('.fa-info-circle').forEach(icon => {
    icon.addEventListener('click', function(e) {
      e.stopPropagation();
      const tooltip = this.closest('.form-group').querySelector('.field-tooltip');
      
      // Fecha outros tooltips abertos
      document.querySelectorAll('.field-tooltip.active').forEach(t => {
        if (t !== tooltip) t.classList.remove('active');
      });
      
      // Alterna o tooltip atual
      tooltip.classList.toggle('active');
    });
  });
  
  // Fecha tooltips ao clicar fora
  document.addEventListener('click', function() {
    document.querySelectorAll('.field-tooltip.active').forEach(t => {
      t.classList.remove('active');
    });
  });
});

};

