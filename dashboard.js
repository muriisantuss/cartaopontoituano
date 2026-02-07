let unsub = null;
let currentLider = "";
let selectedDocId = null;
let signaturePadLider = null;
let assinaturaLiderCache = null;

const mapaLideres = {
    "andre.iasi@ituanofc.com": "Andre Iasi",
    "cristian.mendes@ituanofc.com": "Cristian Jiacomin Redondo Mendes",
    "geovana.medeiros@ituanofc.com": "Geovana De Assis Camargo Medeiros",
    "gustavo.nakaoka@ituanofc.com": "Gustavo Nakaoka",
    "henrique.borges@ituanofc.com": "Henrique Nascimento Borges",
    "luiz.silva@ituanofc.com": "Luiz Eduardo Bragatto Da Silva",
    "simone.dias@ituanofc.com": "Simone Aparecida Pereira Dias"
};

// --- INICIALIZAÇÃO ---
window.addEventListener('firebaseReady', () => {
    const user = window.auth.currentUser;
    const nomeCompleto = mapaLideres[user.email] || "Líder";
    
    // Nome curto para exibição
    const nomeCurto = nomeCompleto.split(' ').slice(0, 2).join(' ');
    currentLider = nomeCompleto; 
    
    document.getElementById('nome-lider-exibicao').innerText = `Olá, ${nomeCurto}`;
    
    // Configura o canvas do modal
    const canvas = document.getElementById('canvas-lider');
    if (canvas) {
        signaturePadLider = new SignaturePad(canvas);
    }
    
    window.filtrar('pendente');
});

// --- FUNÇÃO PARA CORRIGIR O CURSOR TORTO E USAR CACHE ---
function resizeCanvasLider() {
    const canvas = document.getElementById('canvas-lider');
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    
    // Se já tem assinatura na memória, desenha ela de volta
    if (assinaturaLiderCache) {
        signaturePadLider.fromDataURL(assinaturaLiderCache);
    } else {
        signaturePadLider.clear();
    }
}

// --- FILTRO ---
window.filtrar = function(statusAlvo) {
    const lista = document.getElementById('cp-list');
    const botoes = document.querySelectorAll('.filter-btn');
    
    botoes.forEach(b => {
        b.classList.remove('active');
        if (b.innerText.toLowerCase().includes(statusAlvo)) b.classList.add('active');
    });

    if (unsub) unsub();

    const q = window.query(
        window.collection(window.db, "comunicados"),
        window.where("lider", "==", currentLider),
        window.where("status", "==", statusAlvo)
    );

    unsub = window.onSnapshot(q, (snapshot) => {
        lista.innerHTML = "";
        
        if (snapshot.empty) {
            lista.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Nenhum documento na aba "${statusAlvo}".</p>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Lógica de exibição do card (Opção A ou B)
            let resumo = "Sem dados";
            let icone = "📅";
            
            if (data.opcaoA && data.opcaoA.data) {
                const dataF = data.opcaoA.data.split('-').reverse().join('/');
                resumo = `Dia Único: ${dataF}`;
            } 
            else if (data.opcaoB) {
                icone = "📝";
                resumo = `Múltiplos: ${data.opcaoB.substring(0, 40)}...`;
            }

            lista.innerHTML += `
                <div class="cp-card">
                    <div class="card-info">
                        <strong>${data.colaborador}</strong>
                        <span>${icone} ${resumo}</span>
                    </div>
                    <div class="card-actions">
                        ${renderBotoes(doc.id, statusAlvo)}
                    </div>
                </div>`;
        });
    });
};

function renderBotoes(id, aba) {
    if (aba === 'pendente') {
        return `
            <button class="btn-small" onclick="window.prepararAssinatura('${id}')">Ver e Assinar</button>
            <button class="btn-small" style="background:#d32f2f;" onclick="window.excluirCP('${id}')">Recusar</button>
        `;
    }
    if (aba === 'assinado') {
        return `
            <button class="btn-small" onclick="window.gerarPDF('${id}', true)">Visualizar</button>
            <button class="btn-small" style="background:#2e7d32;" onclick="window.compartilharNativo('${id}')">Baixar / Enviar</button>
            <button class="btn-small" style="background:#666;" onclick="window.removerAssinatura('${id}')">Remover Assinatura</button>
        `;
    }
    return `
        <button class="btn-small" onclick="window.gerarPDF('${id}', true)">Visualizar</button>
        <button class="btn-small" style="background:#d32f2f;" onclick="window.excluirCP('${id}')">Apagar</button>
    `;
}

// --- MODAL ---
window.prepararAssinatura = async (id) => {
    selectedDocId = id;
    const docRef = window.doc(window.db, "comunicados", id);
    const docSnap = await window.getDoc(docRef);
    
    if (docSnap.exists()) {
        const dados = docSnap.data();
        const divDetalhes = document.getElementById('detalhes-cp');
        
        let html = `<strong>Colaborador:</strong> ${dados.colaborador}<br><br>`;
        
        if (dados.opcaoA && dados.opcaoA.data) {
            html += `
                <strong>OPÇÃO A (Dia Único):</strong><br>
                Data: ${dados.opcaoA.data.split('-').reverse().join('/')}<br>
                Horário: ${dados.opcaoA.entrada} às ${dados.opcaoA.saida}<br>
                <em>Justificativa: ${dados.opcaoA.justificativa}</em>
            `;
        }
        
        if (dados.opcaoB) {
            html += `
                <strong>OPÇÃO B (Múltiplos Dias):</strong><br>
                <div style="white-space: pre-wrap; border-left:3px solid #d32f2f; padding-left:10px;">${dados.opcaoB}</div>
            `;
        }

        divDetalhes.innerHTML = html;
        document.getElementById('modal-assinatura').style.display = 'flex';
        
        setTimeout(resizeCanvasLider, 100);
    }
};

window.fecharModal = () => document.getElementById('modal-assinatura').style.display = 'none';

window.limparAssinaturaLider = () => {
    assinaturaLiderCache = null;
    if (signaturePadLider) signaturePadLider.clear();
};

window.confirmarAssinatura = async () => {
    if (signaturePadLider.isEmpty()) return alert("Assine antes de confirmar!");

    assinaturaLiderCache = signaturePadLider.toDataURL();

    const docRef = window.doc(window.db, "comunicados", selectedDocId);
    await window.updateDoc(docRef, {
        status: 'assinado',
        assinaturaLider: assinaturaLiderCache,
        dataAssinaturaLider: new Date().toLocaleDateString('pt-BR')
    });
    window.fecharModal();
    alert("Assinado com sucesso!");
};

// --- GERAÇÃO DE PDF E COMPARTILHAMENTO ---
async function criarDocumentoPDF(dados) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("C.P. - COMUNICADO PESSOAL", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("ITUANO FC - SISTEMA DIGITAL", 105, 22, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Colaborador: ${dados.colaborador}`, 20, 45);
    doc.text(`Líder: ${dados.lider}`, 20, 52);

    doc.setFillColor(245, 245, 245);
    doc.rect(20, 60, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO A: AJUSTE DE DIA ÚNICO", 25, 65);
    doc.setFontSize(10);
    
    if (dados.opcaoA && dados.opcaoA.data) {
        const dataF = dados.opcaoA.data.split('-').reverse().join('/');
        doc.text(`Data: ${dataF} | Entrada: ${dados.opcaoA.entrada} | Saída: ${dados.opcaoA.saida}`, 20, 73);
        doc.text(`Justificativa: ${dados.opcaoA.justificativa}`, 20, 79);
    } else {
        doc.text("--- Não preenchido ---", 20, 73);
    }

    doc.setFillColor(245, 245, 245);
    doc.rect(20, 90, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO B: MÚLTIPLOS DIAS / PERÍODO", 25, 95);
    doc.setFontSize(10);
    
    if (dados.opcaoB) {
        const splitMulti = doc.splitTextToSize(dados.opcaoB, 170);
        doc.text(splitMulti, 20, 103);
    } else {
        doc.text("--- Não preenchido ---", 20, 103);
    }

    doc.setFontSize(9);
    doc.text("MOVIMENTAÇÃO (Assinalar):", 20, 145);
    doc.text("(  ) Abonar Horas    (  ) Compensar    (  ) Hora Extra", 20, 152);
    doc.text("(  ) Banco de Horas  (  ) Descontar Horas (  ) Descontar + DSR", 20, 159);

    doc.line(20, 200, 90, 200);
    doc.text("Assinatura Funcionário", 35, 205);
    
    if (dados.assinaturaColaborador) {
        try { doc.addImage(dados.assinaturaColaborador, 'PNG', 30, 170, 50, 20); } catch(e){}
    }

    doc.line(120, 200, 190, 200);
    doc.text("Assinatura da Gestão", 135, 205);

    if (dados.assinaturaLider) {
        try { doc.addImage(dados.assinaturaLider, 'PNG', 130, 170, 50, 20); } catch(e){}
    }

    return doc;
}

window.gerarPDF = async (id, apenasVisualizar = false) => {
    const docRef = window.doc(window.db, "comunicados", id);
    const docSnap = await window.getDoc(docRef);
    const dados = docSnap.data();
    
    const doc = await criarDocumentoPDF(dados);

    // Nome do Arquivo
    const nomeDois = dados.colaborador.split(' ').slice(0, 2).join('');
    const liderDois = dados.lider.split(' ').slice(0, 2).join('');
    let dataFile = "Multi";
    if (dados.opcaoA && dados.opcaoA.data) {
        const partes = dados.opcaoA.data.split('-');
        dataFile = `${partes[2]}-${partes[1]}`;
    }
    const nomeFinal = `CP_Ituano_${nomeDois}_${dataFile}_${liderDois}.pdf`;

    if (apenasVisualizar) {
        window.open(doc.output('bloburl'), '_blank');
    } else {
        doc.save(nomeFinal);
    }
};

// --- COMPARTILHAMENTO INTELIGENTE (Prioriza Download) ---
window.compartilharNativo = async (id) => {
    const docRef = window.doc(window.db, "comunicados", id);
    const docSnap = await window.getDoc(docRef);
    const dados = docSnap.data();
    
    const doc = await criarDocumentoPDF(dados);
    
    // NOME DO ARQUIVO
    const nomeDois = dados.colaborador.split(' ').slice(0, 2).join('');
    const liderDois = dados.lider.split(' ').slice(0, 2).join('');
    let dataFile = "Multi";
    if (dados.opcaoA && dados.opcaoA.data) {
        const partes = dados.opcaoA.data.split('-');
        dataFile = `${partes[2]}-${partes[1]}`;
    }
    const nomeFinal = `CP_Ituano_${nomeDois}_${dataFile}_${liderDois}.pdf`;

    // 1. SEMPRE BAIXA O ARQUIVO (Garante no PC)
    doc.save(nomeFinal);

    // 2. TENTA COMPARTILHAR (Se for mobile)
    if (navigator.share) {
        try {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], nomeFinal, { type: 'application/pdf' });
            await navigator.share({
                files: [file],
                title: 'CP Aprovado',
                text: `Segue CP de ${dados.colaborador}`
            });
            // Se compartilhou, marca como enviado
            await window.updateDoc(docRef, { status: 'enviado' });
            alert("Enviado com sucesso!");
        } catch (err) {
            // Se cancelou o share mas já baixou, pergunta
            if(confirm("Arquivo baixado. Deseja marcar como ENVIADO?")) {
                await window.updateDoc(docRef, { status: 'enviado' });
            }
        }
    } else {
        // Se for PC (sem share), apenas confirma o envio
        if(confirm("Arquivo baixado com sucesso. Deseja marcar como ENVIADO?")) {
            await window.updateDoc(docRef, { status: 'enviado' });
        }
    }
};

window.removerAssinatura = async (id) => {
    if(confirm("Remover sua assinatura? O documento voltará para 'Pendentes'.")) {
        const docRef = window.doc(window.db, "comunicados", id);
        await window.updateDoc(docRef, {
            status: 'pendente',
            assinaturaLider: null
        });
    }
};

window.excluirCP = async (id) => {
    if(confirm("Deseja realmente apagar este registro?")) {
        await window.deleteDoc(window.doc(window.db, "comunicados", id));
    }
};

window.deslogar = async () => {
    await window.signOut(window.auth);
    window.location.href = 'index.html';
};