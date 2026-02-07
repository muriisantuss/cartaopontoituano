const canvas = document.getElementById('signature-pad');
let signaturePad;

if (canvas) {
    signaturePad = new SignaturePad(canvas);
}

function resizeCanvas() {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if (signaturePad) signaturePad.clear();
}
window.onresize = resizeCanvas;
window.addEventListener("orientationchange", resizeCanvas);
resizeCanvas();

function formatarData(dataISO) {
    if (!dataISO) return "";
    const partes = dataISO.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// --- LIMITE DE LINHAS (OPÇÃO B) ---
const areaTexto = document.getElementById('multi_ajustes');
const contador = document.getElementById('contador-linhas');

areaTexto.addEventListener('input', function() {
    const linhas = this.value.split('\n');
    
    // Se passar de 10 linhas, corta o excesso imediatamente
    if (linhas.length > 10) {
        this.value = linhas.slice(0, 10).join('\n');
        alert("Limite máximo atingido! O PDF comporta apenas 10 linhas.");
    }
    
    const linhasAtuais = this.value.split('\n').length;
    contador.innerText = `${linhasAtuais}/10 Linhas`;
});

// --- VALIDAÇÕES E MODAL ---
window.abrirModalRevisao = function() {
    const colab = document.getElementById('colaborador').value;
    const lider = document.getElementById('lider').value;
    
    if (colab.trim() === "") return alert("Preencha seu nome.");
    if (lider === "") return alert("Selecione seu líder.");
    
    const dataA = document.getElementById('data_single').value;
    const entradaA = document.getElementById('ent_single').value;
    const saidaA = document.getElementById('sai_single').value;
    const justA = document.getElementById('just_single').value;
    const multiB = document.getElementById('multi_ajustes').value;

    const usouOpcaoA = dataA || entradaA || saidaA;
    
    if (usouOpcaoA) {
        if (!justA) return alert("Ao preencher Data ou Horários, a Justificativa é obrigatória!");
        if (!dataA) return alert("Preencha a Data na Opção A.");
        
        const dataSelecionada = new Date(dataA);
        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - 3);
        
        if (dataSelecionada < dataLimite) {
            return alert("A data não pode ser anterior a 3 meses.");
        }

        if (entradaA && saidaA && entradaA >= saidaA) {
            return alert("A hora de Entrada não pode ser maior ou igual à Saída.");
        }
    }

    if (!usouOpcaoA && !multiB) {
        return alert("Preencha pelo menos a Opção A ou a Opção B.");
    }

    if (signaturePad.isEmpty()) return alert("Faça sua assinatura.");

    let resumo = `<strong>Nome:</strong> ${colab}<br><strong>Líder:</strong> ${lider}<br><hr>`;
    
    if (usouOpcaoA) {
        resumo += `<strong>Opção A (Dia Único):</strong><br>
                   Data: ${formatarData(dataA)}<br>
                   Horário: ${entradaA} às ${saidaA}<br>
                   Justificativa: ${justA}<br>`;
    }
    
    if (multiB) {
        resumo += `<br><strong>Opção B (Múltiplos):</strong><br>Preenchido (${multiB.split('\n').length} linhas)`;
    }

    document.getElementById('resumo-dados').innerHTML = resumo;
    document.getElementById('modal-revisao').style.display = 'flex';
};

window.fecharModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

// --- ENVIO DEFINITIVO ---
window.enviarDefinitivo = async function() {
    if (!window.db || !window.addDoc) return alert("Erro de conexão. Recarregue a página.");

    try {
        const colab = document.getElementById('colaborador').value;
        const lider = document.getElementById('lider').value;
        const assinaturaImg = signaturePad.toDataURL(); 

        await window.addDoc(window.collection(window.db, "comunicados"), {
            colaborador: colab,
            lider: lider,
            opcaoA: {
                data: document.getElementById('data_single').value,
                entrada: document.getElementById('ent_single').value,
                saida: document.getElementById('sai_single').value,
                justificativa: document.getElementById('just_single').value
            },
            opcaoB: document.getElementById('multi_ajustes').value,
            assinaturaColaborador: assinaturaImg, 
            status: "pendente",
            criadoEm: window.serverTimestamp()
        });

        window.fecharModal('modal-revisao');
        document.getElementById('modal-sucesso').style.display = 'flex';

    } catch (e) {
        console.error(e);
        alert("Erro ao enviar: " + e.message);
    }
};

// --- BAIXAR CÓPIA (Layout Ajustado com Espaçamento) ---
window.baixarCopiaPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const colab = document.getElementById('colaborador').value;
    const lider = document.getElementById('lider').value;
    const dataA = document.getElementById('data_single').value;
    const entA = document.getElementById('ent_single').value;
    const saiA = document.getElementById('sai_single').value;
    const justA = document.getElementById('just_single').value;
    const multiB = document.getElementById('multi_ajustes').value;

    // 1. Cabeçalho
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("C.P. - COMUNICADO PESSOAL", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("ITUANO FC - SISTEMA DIGITAL", 105, 22, { align: "center" });

    // 2. Dados Pessoais
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Colaborador: ${colab}`, 20, 45);
    doc.text(`Líder: ${lider}`, 20, 52);

    // 3. Opção A
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 60, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO A: AJUSTE DE DIA ÚNICO", 25, 65);
    doc.setFontSize(10);
    
    if (dataA) {
        doc.text(`Data: ${formatarData(dataA)} | Entrada: ${entA} | Saída: ${saiA}`, 20, 73);
        doc.text(`Justificativa: ${justA}`, 20, 79);
    } else {
        doc.text("--- Não preenchido ---", 20, 73);
    }

    // 4. Opção B
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 90, 170, 7, 'F');
    doc.setFontSize(10);
    doc.text("OPÇÃO B: MÚLTIPLOS DIAS / PERÍODO", 25, 95);
    doc.setFontSize(9);
    
    if (multiB) {
        const splitMulti = doc.splitTextToSize(multiB, 170);
        doc.text(splitMulti, 20, 103);
    } else {
        doc.text("--- Não preenchido ---", 20, 103);
    }

    // 5. MOVIMENTAÇÃO (Ajustado para Y=160)
    doc.setFontSize(9);
    doc.text("MOVIMENTAÇÃO (Assinalar):", 20, 190);
    doc.text("(  ) Abonar Horas    (  ) Compensar    (  ) Hora Extra", 20, 197);
    doc.text("(  ) Banco de Horas  (  ) Descontar Horas (  ) Descontar + DSR", 20, 202);

    // 6. ASSINATURAS (Ajustado para Y=220)
    if (signaturePad && !signaturePad.isEmpty()) {
        const sigImg = signaturePad.toDataURL();
        // Aumentei o Y para 210 para a imagem ficar acima da linha 240
        doc.addImage(sigImg, 'PNG', 30, 215, 50, 20);
    }
    
    // Linhas baixaram para Y=240
    doc.line(20, 240, 90, 240);
    doc.text("Assinatura Funcionário", 35, 245);
    
    // Gestão vazia (Pois é só cópia)
    doc.line(120, 240, 190, 240);
    doc.text("Assinatura da Gestão (Pendente)", 135, 245);

    // Formata o nome do arquivo
    const nomeDois = colab.split(' ').slice(0, 2).join('');
    doc.save(`CP_Copia_${nomeDois}.pdf`);
};