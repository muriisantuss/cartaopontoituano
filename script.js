const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas);

// Função para formatar a data do padrão ISO (AAAA-MM-DD) para PT-BR (DD/MM/AAAA)
function formatarData(dataISO) {
    if (!dataISO) return "";
    const partes = dataISO.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear();
}
window.onresize = resizeCanvas;
resizeCanvas();

async function processPDF() {
    const { jsPDF } = window.jspdf;

    const colab = document.getElementById('colaborador').value;
    const lider = document.getElementById('lider').value;
    const dataBruta = document.getElementById('data_single').value;

    // Validações de obrigatoriedade
    if (colab.trim() === "") {
        alert("O nome do colaborador é obrigatório.");
        return;
    }
    if (lider === "") {
        alert("Por favor, selecione um líder.");
        return;
    }
    if (signaturePad.isEmpty()) {
        alert("A assinatura é obrigatória. Por favor, assine antes de gerar o PDF.");
        return;
    }

    async function salvarNoFirebase(dados) {
        try {
            await window.addDoc(window.collection(window.db, "comunicados"), {
                colaborador: colab,
                lider: lider,
                data: dataBruta,
                justificativa: document.getElementById('just_single').value || "Não informada",
                status: "pendente",
                criadoEm: window.serverTimestamp()
            });
            console.log("Dados salvos no Firebase com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar no banco: ", e);
        }
    }

    const doc = new jsPDF();
    const dataFormatada = formatarData(dataBruta);

    // Configurações visuais do PDF
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
    doc.text(`Colaborador: ${colab}`, 20, 45);
    doc.text(`Líder: ${lider}`, 20, 52);

    // Opção A
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 60, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO A: AJUSTE DE DIA ÚNICO", 25, 65);
    doc.setFontSize(10);
    doc.text(`Data: ${dataFormatada} | Entrada: ${document.getElementById('ent_single').value} | Saída: ${document.getElementById('sai_single').value}`, 20, 73);
    doc.text(`Justificativa: ${document.getElementById('just_single').value}`, 20, 79);

    // Opção B
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 90, 170, 7, 'F');
    doc.setFontSize(9);
    doc.text("OPÇÃO B: MÚLTIPLOS DIAS / PERÍODO", 25, 95);
    doc.setFontSize(10);
    const multiTexto = document.getElementById('multi_ajustes').value;
    const splitMulti = doc.splitTextToSize(multiTexto, 170);
    doc.text(splitMulti, 20, 103);

    // Movimentação
    doc.setFontSize(9);
    doc.text("MOVIMENTAÇÃO (Assinalar):", 20, 145);
    doc.text("(  ) Abonar Horas    (  ) Compensar    (  ) Hora Extra", 20, 152);
    doc.text("(  ) Banco de Horas  (  ) Descontar Horas (  ) Descontar + DSR", 20, 159);

    // Inclusão da Assinatura
    if (!signaturePad.isEmpty()) {
        const sigImg = signaturePad.toDataURL();
        doc.addImage(sigImg, 'PNG', 30, 175, 50, 20);
    }
    doc.line(20, 200, 90, 200);
    doc.text("Assinatura Funcionário", 35, 205);
    doc.line(120, 200, 190, 200);
    doc.text("Assinatura da Gestão", 135, 205);

    const fileName = `CP_Ituano_${colab}.pdf`;
    doc.save(fileName);

    // Compartilhamento Mobile
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
}