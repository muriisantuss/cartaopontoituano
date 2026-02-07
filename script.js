const canvas = document.getElementById('signature-pad');
let signaturePad;

// Garante que o canvas carregou antes de iniciar o pad
if (canvas) {
    signaturePad = new SignaturePad(canvas);
}

function formatarData(dataISO) {
    if (!dataISO) return "";
    const partes = dataISO.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function resizeCanvas() {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if (signaturePad) signaturePad.clear(); // Limpa para evitar bugs de escala
}
window.onresize = resizeCanvas;
resizeCanvas();

// Torna a função global para o botão do HTML achar
window.processPDF = async function() {
    const { jsPDF } = window.jspdf;

    const colab = document.getElementById('colaborador').value;
    const lider = document.getElementById('lider').value;
    
    // Dados Opção A
    const dataA = document.getElementById('data_single').value;
    const entradaA = document.getElementById('ent_single').value;
    const saidaA = document.getElementById('sai_single').value;
    const justA = document.getElementById('just_single').value;
    
    // Dados Opção B
    const multiB = document.getElementById('multi_ajustes').value;

    // Validações
    if (colab.trim() === "") return alert("O nome do colaborador é obrigatório.");
    if (lider === "") return alert("Por favor, selecione um líder.");
    if (!signaturePad || signaturePad.isEmpty()) return alert("A assinatura é obrigatória.");

    // --- SALVAMENTO NO FIREBASE (AGORA COM ASSINATURA) ---
    async function salvarNoFirebase() {
        if (!window.db || !window.addDoc) {
            alert("Erro de conexão: O sistema ainda está carregando o banco de dados. Aguarde 5 segundos e tente novamente.");
            return false;
        }

        try {
            // Captura a assinatura como imagem Base64
            const assinaturaImg = signaturePad.toDataURL(); 

            await window.addDoc(window.collection(window.db, "comunicados"), {
                colaborador: colab,
                lider: lider,
                
                // Estrutura de dados completa para o Dashboard
                opcaoA: {
                    data: dataA,
                    entrada: entradaA,
                    saida: saidaA,
                    justificativa: justA
                },
                opcaoB: multiB,
                
                // AQUI ESTÁ A MUDANÇA: Salvando a assinatura do colaborador
                assinaturaColaborador: assinaturaImg, 
                
                status: "pendente",
                criadoEm: window.serverTimestamp()
            });
            console.log("Salvo no Firebase com assinatura!");
            return true;
        } catch (e) {
            console.error("Erro Firebase:", e);
            alert("Erro ao salvar dados: " + e.message);
            return false;
        }
    }

    const salvou = await salvarNoFirebase();
    if (!salvou) return; 

    // --- GERAÇÃO DO PDF (Visual para o Colaborador) ---
    const doc = new jsPDF();

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
    doc.text(`Data: ${formatarData(dataA)} | Entrada: ${entradaA} | Saída: ${saidaA}`, 20, 73);
    doc.text(`Justificativa: ${justA}`, 20, 79);

    // 4. Opção B
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 90, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO B: MÚLTIPLOS DIAS / PERÍODO", 25, 95);
    doc.setFontSize(10);
    const splitMulti = doc.splitTextToSize(multiB, 170);
    doc.text(splitMulti, 20, 103);

    // 5. Movimentação
    doc.setFontSize(9);
    doc.text("MOVIMENTAÇÃO (Assinalar):", 20, 145);
    doc.text("(  ) Abonar Horas    (  ) Compensar    (  ) Hora Extra", 20, 152);
    doc.text("(  ) Banco de Horas  (  ) Descontar Horas (  ) Descontar + DSR", 20, 159);

    // 6. Assinaturas
    // Colaborador (Agora desenhamos a imagem capturada)
    if (signaturePad && !signaturePad.isEmpty()) {
        const sigImg = signaturePad.toDataURL();
        doc.addImage(sigImg, 'PNG', 30, 175, 50, 20);
    }
    doc.line(20, 200, 90, 200);
    doc.text("Assinatura Funcionário", 35, 205);
    
    // Gestão (Vazio neste momento)
    doc.line(120, 200, 190, 200);
    doc.text("Assinatura da Gestão", 135, 205);

    // Salvar e Compartilhar
    const doisNomes = colab.split(' ').slice(0, 2).join('');
    const fileName = `CP_Ituano_${doisNomes}.pdf`;
    
    doc.save(fileName);

    if (navigator.share) {
        try {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            await navigator.share({
                files: [file],
                title: 'C.P. Ituano FC',
                text: `Segue CP de ${colab}`
            });
        } catch (err) {
            console.log("Compartilhamento cancelado.");
        }
    }
};