/**
 * CALENDÁRIO INTELIGENTE INTEGRADO
 * Sincronizado com o cronograma Unificado, Caderno de Erros e Flashcards
 */
(function() {
    const STORAGE_KEY = 'pm_pi_2026_10_24_confirmacoes';
    const INICIO_ESTUDOS = new Date(2026, 9, 24); // 24/10/2026
    const PROVA_PI = new Date(2026, 11, 4);      // 04/12/2026

    // Lista padronizada de assuntos PM-PI
    const ASSUNTOS_BASE = [
        { nome: 'Interpretação de Textos', materia: 'Português', desc: 'Compreensão global, inferências, ideias principais. 10,7% da prova.' },
        { nome: 'Sintaxe', materia: 'Português', desc: 'Termos essenciais, integrantes e acessórios. 3,6% da prova.' },
        { nome: 'Morfologia', materia: 'Português', desc: 'Classes de palavras: verbos, pronomes, conjunções.' },
        { nome: 'Pontuação', materia: 'Português', desc: 'Vírgula, ponto, travessão, aspas. 2,3% da prova.' },
        { nome: 'Regência e Crase', materia: 'Português', desc: 'Regência verbal e nominal. Crase.' },
        { nome: 'Concordância', materia: 'Português', desc: 'Concordância verbal e nominal.' },
        { nome: 'Figuras de Linguagem', materia: 'Português', desc: 'Metáfora, metonímia, hipérbole, ironia.' },
        { nome: 'Ortografia e Acentuação', materia: 'Português', desc: 'Regras de escrita e acentuação.' },
        { nome: 'Semântica', materia: 'Português', desc: 'Significação de palavras, sinônimos, antônimos.' },
        { nome: 'Conjuntos', materia: 'Matemática', desc: 'Operações com conjuntos, diagramas de Venn.' },
        { nome: 'Proporcionalidade', materia: 'Matemática', desc: 'Regra de três simples e composta.' },
        { nome: 'Equações', materia: 'Matemática', desc: 'Equações de 1º e 2º grau.' },
        { nome: 'Raciocínio Lógico', materia: 'Raciocínio Lógico', desc: 'Proposições, equivalências, negação.' },
        { nome: 'Geometria Plana', materia: 'Matemática', desc: 'Triângulos, quadriláteros, circunferência.' },
        { nome: 'Matemática Financeira', materia: 'Matemática', desc: 'Juros simples e compostos.' },
        { nome: 'Windows 10', materia: 'Informática', desc: 'Sistema operacional, configurações, atalhos.' },
        { nome: 'Word 2019', materia: 'Informática', desc: 'Edição de texto, formatação, tabelas.' },
        { nome: 'Excel 2019', materia: 'Informática', desc: 'Planilhas, fórmulas, funções.' },
        { nome: 'Internet', materia: 'Informática', desc: 'Conceitos, navegadores, sites de busca.' },
        { nome: 'Hardware', materia: 'Informática', desc: 'Processador, memórias, periféricos.' },
        { nome: 'Política Brasileira', materia: 'Conhecimentos Gerais', desc: 'Estrutura política, poderes, eleições.' },
        { nome: 'Meio Ambiente', materia: 'Conhecimentos Gerais', desc: 'Ecologia, sustentabilidade, aquecimento global.' },
        { nome: 'Segurança Pública', materia: 'Conhecimentos Gerais', desc: 'Políticas de segurança, defesa civil.' },
        { nome: 'História do Brasil - República Velha', materia: 'História do Brasil', desc: 'República Velha, oligarquias, café com leite.' },
        { nome: 'História do Brasil - Era Vargas', materia: 'História do Brasil', desc: 'Getúlio Vargas, Estado Novo, industrialização.' },
        { nome: 'História do Brasil - Golpe e Ditadura', materia: 'História do Brasil', desc: '1964, AI-5, resistência, abertura.' },
        { nome: 'História do Brasil - Redemocratização', materia: 'História do Brasil', desc: 'Diretas Já, Constituição de 88.' },
        { nome: 'Geografia do Brasil - População', materia: 'Geografia do Brasil', desc: 'Distribuição, crescimento, estrutura etária.' },
        { nome: 'Geografia do Brasil - Economia', materia: 'Geografia do Brasil', desc: 'Industrialização, fronteiras agrícolas.' },
        { nome: 'Geografia do Brasil - Recursos Naturais', materia: 'Geografia do Brasil', desc: 'Aproveitamento, conservação.' },
        { nome: 'Geografia do Piauí', materia: 'Regionais PI', desc: 'Relevo, clima, hidrografia, economia do Piauí.' },
        { nome: 'História do Piauí', materia: 'Regionais PI', desc: 'Formação histórica, colonização, Balaiada.' },
        { nome: 'Estatuto do PM (Lei 3.808/81)', materia: 'Legislação PMPI', desc: 'Direitos, deveres, regime disciplinar da PMPI.' },
        { nome: 'Código de Ética (Lei 7.725/2022)', materia: 'Legislação PMPI', desc: 'Normas de conduta, ética profissional.' },
        { nome: 'Lei Orgânica (14.751/2023)', materia: 'Legislação PMPI', desc: 'Organização nacional das PMs.' },
        { nome: 'R-200 (Decreto 88.777/83)', materia: 'Legislação PMPI', desc: 'Regulamento geral para PMs.' },
        { nome: 'Direitos Individuais (art. 5º)', materia: 'Direito Constitucional', desc: 'Garantias fundamentais.' },
        { nome: 'Direitos Sociais', materia: 'Direito Constitucional', desc: 'Direitos dos trabalhadores.' },
        { nome: 'Nacionalidade', materia: 'Direito Constitucional', desc: 'Brasileiros natos e naturalizados.' },
        { nome: 'Segurança Pública (art. 144)', materia: 'Direito Constitucional', desc: 'Forças de segurança.' },
        { nome: 'PIDCP', materia: 'Direitos Humanos', desc: 'Pacto Internacional dos Direitos Civis.' },
        { nome: 'Convenção contra Tortura', materia: 'Direitos Humanos', desc: 'Proibição da tortura.' },
        { nome: 'Teoria do Crime', materia: 'Direito Penal', desc: 'Fato típico, ilicitude, culpabilidade.' },
        { nome: 'Crimes contra a Pessoa', materia: 'Direito Penal', desc: 'Homicídio, lesões, honra.' },
        { nome: 'Crimes contra o Patrimônio', materia: 'Direito Penal', desc: 'Furto, roubo, estelionato.' },
        { nome: 'Crimes contra a Administração Pública', materia: 'Direito Penal', desc: 'Peculato, corrupção.' },
        { nome: 'Crimes contra a Fé Pública', materia: 'Direito Penal', desc: 'Falsificação, moeda falsa.' },
        { nome: 'Penas e Aplicação', materia: 'Direito Penal', desc: 'Espécies de penas, regimes.' },
        { nome: 'Lei Maria da Penha', materia: 'Legislação Especial', desc: 'Violência doméstica. Só PM-PI.' },
        { nome: 'Juizados Especiais Criminais', materia: 'Legislação Especial', desc: 'Procedimento sumaríssimo. Só PM-PI.' },
        { nome: 'Lei Ambiental (9.605/98)', materia: 'Legislação Especial', desc: 'Crimes ambientais. Só PM-PI.' },
        { nome: 'ECA - Crimes', materia: 'Legislação Especial', desc: 'Crimes do ECA. Só PM-PI.' },
        { nome: 'Abuso de Autoridade', materia: 'Legislação Especial', desc: 'Crimes de abuso. Só PM-PI.' },
        { nome: 'Regime Jurídico Administrativo', materia: 'Direito Administrativo', desc: 'Princípios da administração. Só PM-PI.' },
        { nome: 'Poderes Administrativos', materia: 'Direito Administrativo', desc: 'Poderes da administração. Só PM-PI.' },
        { nome: 'Responsabilidade Civil do Estado', materia: 'Direito Administrativo', desc: 'Teorias da responsabilidade. Só PM-PI.' },
        { nome: 'Improbidade Administrativa', materia: 'Direito Administrativo', desc: 'Atos de improbidade. Só PM-PI.' },
        { nome: 'Organização Administrativa', materia: 'Direito Administrativo', desc: 'Administração direta e indireta. Só PM-PI.' },
        { nome: 'Constituição do Estado do Piauí', materia: 'Constituição Estadual', desc: 'Organização do estado. Só PM-PI.' }
    ];

    function dataISO(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function obterCronogramaPorData() {
        const mapa = {};
        let indice = 0;
        const total = ASSUNTOS_BASE.length;
        const pt = ASSUNTOS_BASE.filter(i => i.materia === 'Português');
        const mat = ASSUNTOS_BASE.filter(i => ['Matemática', 'Raciocínio Lógico'].includes(i.materia));
        const leg = ASSUNTOS_BASE.filter(i => i.materia === 'Legislação PMPI');
        const outras = ASSUNTOS_BASE.filter(i => !['Português', 'Matemática', 'Raciocínio Lógico', 'Legislação PMPI'].includes(i.materia));

        for (let dt = new Date(INICIO_ESTUDOS); dt <= PROVA_PI; dt.setDate(dt.getDate() + 1), indice++) {
            const base = indice % 2 === 0 ? pt[Math.floor(indice / 2) % pt.length] : mat[Math.floor(indice / 2) % mat.length];
            const tLeg = leg[indice % leg.length];
            const tOutras = outras[indice % outras.length];
            const temas = [base, tLeg, tOutras].filter(Boolean);
            mapa[dataISO(dt)] = {
                data: new Date(dt),
                iso: dataISO(dt),
                temas: temas
            };
        }
        return mapa;
    }

    const cronogramaMapa = obterCronogramaPorData();

    let anoAtual = new Date().getFullYear();
    let mesAtual = new Date().getMonth();

    function carregarConfirmacoes() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch { return {}; }
    }

    function salvarConfirmacoes(conf) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conf));
        } catch {}
    }

    function criarElementosDOM() {
        if (document.getElementById('calModalOverlay')) return;

        const html = `
        <div id="calModalOverlay" class="cal-modal-overlay">
            <div class="cal-container">
                <div class="cal-header">
                    <div class="cal-title-area">
                        <h2>📅 Calendário Inteligente de Estudos</h2>
                        <span id="calMesAnoTexto" style="font-size: 1rem; color: #94a3b8; font-weight: 600;"></span>
                    </div>
                    <div class="cal-nav-buttons">
                        <button class="cal-nav-btn" id="calBtnHoje">Hoje</button>
                        <button class="cal-nav-btn" id="calBtnMesAnt">◀ Anterior</button>
                        <button class="cal-nav-btn" id="calBtnMesProx">Próximo ▶</button>
                        <button class="cal-close-btn" id="calBtnFechar" title="Fechar">&times;</button>
                    </div>
                </div>
                <div class="cal-body">
                    <div class="cal-weekdays">
                        <div class="cal-weekday">DOM</div>
                        <div class="cal-weekday">SEG</div>
                        <div class="cal-weekday">TER</div>
                        <div class="cal-weekday">QUA</div>
                        <div class="cal-weekday">QUI</div>
                        <div class="cal-weekday">SEX</div>
                        <div class="cal-weekday">SÁB</div>
                    </div>
                    <div class="cal-grid" id="calGridDias"></div>
                </div>
            </div>
        </div>

        <div id="calPopoverOverlay" class="cal-popover-overlay">
            <div class="cal-popover" id="calPopoverConteudo"></div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('calBtnFechar').onclick = fecharCalendario;
        document.getElementById('calModalOverlay').onclick = e => {
            if (e.target.id === 'calModalOverlay') fecharCalendario();
        };
        document.getElementById('calBtnHoje').onclick = () => {
            anoAtual = new Date().getFullYear();
            mesAtual = new Date().getMonth();
            renderizarGrid();
        };
        document.getElementById('calBtnMesAnt').onclick = () => {
            mesAtual--;
            if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
            renderizarGrid();
        };
        document.getElementById('calBtnMesProx').onclick = () => {
            mesAtual++;
            if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
            renderizarGrid();
        };

        document.getElementById('calPopoverOverlay').onclick = e => {
            if (e.target.id === 'calPopoverOverlay') fecharPopover();
        };
    }

    function renderizarGrid() {
        const grid = document.getElementById('calGridDias');
        if (!grid) return;
        grid.innerHTML = '';

        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        document.getElementById('calMesAnoTexto').textContent = `${nomesMeses[mesAtual]} de ${anoAtual}`;

        const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
        const diaSemanaInicial = primeiroDiaMes.getDay();
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        const ultimoDiaMesAnt = new Date(anoAtual, mesAtual, 0).getDate();

        const hojeStr = dataISO(new Date());
        const confirmacoes = carregarConfirmacoes();

        // Dias do mês anterior
        for (let i = diaSemanaInicial - 1; i >= 0; i--) {
            const diaNum = ultimoDiaMesAnt - i;
            const dt = new Date(anoAtual, mesAtual - 1, diaNum);
            grid.appendChild(criarCelulaDia(dt, true, confirmacoes, hojeStr));
        }

        // Dias do mês atual
        for (let d = 1; d <= ultimoDiaMes; d++) {
            const dt = new Date(anoAtual, mesAtual, d);
            grid.appendChild(criarCelulaDia(dt, false, confirmacoes, hojeStr));
        }

        // Preenchimento do mês seguinte para fechar grid
        const totalCelulas = grid.children.length;
        const restante = (7 - (totalCelulas % 7)) % 7;
        for (let d = 1; d <= restante; d++) {
            const dt = new Date(anoAtual, mesAtual + 1, d);
            grid.appendChild(criarCelulaDia(dt, true, confirmacoes, hojeStr));
        }
    }

    function criarCelulaDia(dataObj, outroMes, confirmacoes, hojeStr) {
        const iso = dataISO(dataObj);
        const celula = document.createElement('div');
        celula.className = `cal-cell ${outroMes ? 'outro-mes' : ''} ${iso === hojeStr ? 'hoje' : ''}`;

        const diaNum = dataObj.getDate();
        const programado = cronogramaMapa[iso];
        const estaConcluido = !!confirmacoes[`pi_${iso}`];

        let statusClass = 'futuro';
        let statusIcon = '⚡';
        const hojeObj = new Date();
        hojeObj.setHours(0,0,0,0);
        const dataComparar = new Date(dataObj);
        dataComparar.setHours(0,0,0,0);

        if (estaConcluido) {
            statusClass = 'concluido';
            statusIcon = '✔';
        } else if (dataComparar < hojeObj) {
            statusClass = 'pendente';
            statusIcon = '❌';
        }

        let chipsHTML = '';
        if (programado && programado.temas) {
            programado.temas.forEach(tema => {
                chipsHTML += `
                    <div class="cal-chip ${statusClass}" title="${tema.materia}: ${tema.nome}">
                        <span class="cal-chip-icon">${statusIcon}</span>
                        <span class="cal-chip-text">${tema.nome}</span>
                    </div>
                `;
            });
        }

        celula.innerHTML = `
            <div class="cal-cell-header">
                <span class="cal-date-num">${diaNum}</span>
                ${iso === hojeStr ? '<span class="cal-badge-hoje">HOJE</span>' : ''}
            </div>
            ${chipsHTML}
        `;

        if (programado) {
            celula.style.cursor = 'pointer';
            celula.onclick = () => abrirPopoverDia(iso, programado, estaConcluido);
        }

        return celula;
    }

    function abrirPopoverDia(iso, programado, estaConcluido) {
        const popover = document.getElementById('calPopoverConteudo');
        const overlay = document.getElementById('calPopoverOverlay');

        const [y, m, d] = iso.split('-');
        const dataFormatada = `${d}/${m}/${y}`;
        const confirmacoes = carregarConfirmacoes();
        const marcado = !!confirmacoes[`pi_${iso}`];

        let materiasHTML = '';
        programado.temas.forEach(tema => {
            const buscaQC = encodeURIComponent(tema.nome);
            const linkQC = `https://www.qconcursos.com/questoes-de-concursos/questoes?q=${buscaQC}`;
            const linkUnificado = `https://caiomascedo.github.io/unificado/#assunto=${encodeURIComponent(tema.nome)}`;

            materiasHTML += `
                <div class="cal-materia-card">
                    <div class="cal-materia-card-title">
                        <span>📖 ${tema.materia}: ${tema.nome}</span>
                    </div>
                    <div class="cal-materia-desc">💡 ${tema.desc}</div>
                    <div class="cal-card-acoes">
                        <button class="cal-btn-acao cal-btn-caderno" onclick="window.CalendarioInteligente.abrirCadernoAssunto('${tema.nome.replace(/'/g, "\\'")}')">
                            📕 Abrir Caderno de Erros
                        </button>
                        <button class="cal-btn-acao cal-btn-flashcards" onclick="window.CalendarioInteligente.abrirCardsAssunto('${tema.nome.replace(/'/g, "\\'")}')">
                            📇 Fazer Cards do Assunto
                        </button>
                        <a href="${linkQC}" target="_blank" rel="noopener noreferrer" class="cal-btn-acao cal-btn-qc">
                            🎯 QConcursos
                        </a>
                    </div>
                </div>
            `;
        });

        popover.innerHTML = `
            <div class="cal-popover-header">
                <div>
                    <div class="cal-popover-title">📋 Estudos do Dia · ${dataFormatada}</div>
                    <div style="font-size:0.85rem;color:#94a3b8;margin-top:2px;">Revise seus cadernos de erros e responda os cards das matérias</div>
                </div>
                <button class="cal-close-btn" onclick="window.CalendarioInteligente.fecharPopover()">&times;</button>
            </div>
            ${materiasHTML}
            <div class="cal-check-row">
                <label class="cal-toggle-label">
                    <input type="checkbox" id="calCheckConcluirDia" ${marcado ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;">
                    <span>Marcar dia como Concluído (atualiza cor para verde)</span>
                </label>
            </div>
        `;

        document.getElementById('calCheckConcluirDia').onchange = e => {
            const conf = carregarConfirmacoes();
            if (e.target.checked) conf[`pi_${iso}`] = true;
            else delete conf[`pi_${iso}`];
            salvarConfirmacoes(conf);
            renderizarGrid();
            // Disparar sincronização com a página se estiver no Unificado
            if (typeof window.atualizarStats === 'function') window.atualizarStats();
        };

        overlay.classList.add('ativo');
    }

    function fecharPopover() {
        const overlay = document.getElementById('calPopoverOverlay');
        if (overlay) overlay.classList.remove('ativo');
    }

    function abrirCalendario() {
        criarElementosDOM();
        renderizarGrid();
        document.getElementById('calModalOverlay').classList.add('ativo');
    }

    function fecharCalendario() {
        const modal = document.getElementById('calModalOverlay');
        if (modal) modal.classList.remove('ativo');
        fecharPopover();
    }

    // Ações de integração
    function abrirCadernoAssunto(nomeAssunto) {
        fecharCalendario();
        if (typeof window.CadernoIntegrado !== 'undefined' && typeof window.CadernoIntegrado.abrirAssunto === 'function') {
            window.CadernoIntegrado.abrirAssunto(nomeAssunto);
        } else if (typeof window.abrirCadernoIntegrado === 'function') {
            window.abrirCadernoIntegrado();
            setTimeout(() => {
                if (window.CadernoIntegrado?.abrirAssunto) window.CadernoIntegrado.abrirAssunto(nomeAssunto);
            }, 600);
        } else {
            // Se estiver em outra página, abre com o parâmetro
            window.open(`https://caiomascedo.github.io/flashcard/?view=caderno-erros&assunto=${encodeURIComponent(nomeAssunto)}`, '_blank');
        }
    }

    function abrirCardsAssunto(nomeAssunto) {
        fecharCalendario();
        if (typeof window.filtrarPorAssunto === 'function') {
            window.filtrarPorAssunto(nomeAssunto);
        } else if (typeof window.iniciarEstudoGeral === 'function') {
            window.iniciarEstudoGeral();
        } else {
            window.open(`https://caiomascedo.github.io/flashcard/#assunto=${encodeURIComponent(nomeAssunto)}`, '_blank');
        }
    }

    // Expor globalmente
    window.CalendarioInteligente = {
        abrir: abrirCalendario,
        fechar: fecharCalendario,
        fecharPopover: fecharPopover,
        abrirCadernoAssunto: abrirCadernoAssunto,
        abrirCardsAssunto: abrirCardsAssunto
    };

    // Auto-vincular botões de cronograma existentes
    document.addEventListener('DOMContentLoaded', () => {
        const btnCron = document.getElementById('btnCronograma');
        if (btnCron) {
            btnCron.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                abrirCalendario();
            };
        }
    });
})();
