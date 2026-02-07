let unsub = null; // Variável para interromper a escuta quando necessário

function filtrar(statusAlvo) {
    const listaElemento = document.getElementById('cp-list');
    const botoes = document.querySelectorAll('.filter-btn');
    
    // 1. Visual dos botões
    botoes.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(statusAlvo)) btn.classList.add('active');
    });

    // 2. Parar de ouvir a filtragem anterior para economizar memória
    if (unsub) unsub();

    // 3. Criar a consulta ao Firebase (Filtra pelo status)
    const q = window.query(
        window.collection(window.db, "comunicados"), 
        window.where("status", "==", statusAlvo)
    );

    // 4. Ouvir os dados em tempo real
    unsub = window.onSnapshot(q, (snapshot) => {
        listaElemento.innerHTML = "";
        
        if (snapshot.empty) {
            listaElemento.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Nenhum item em "${statusAlvo}".</p>`;
            return;
        }

        snapshot.forEach((doc) => {
            const item = doc.data();
            const id = doc.id;
            
            const card = `
                <div class="cp-card">
                    <div class="card-info">
                        <strong>${item.colaborador}</strong>
                        <span>Líder: ${item.lider} | Data: ${item.data}</span>
                    </div>
                    <div class="card-actions">
                        ${gerarBotaoAcao(id, item.status, item.colaborador)}
                    </div>
                </div>
            `;
            listaElemento.innerHTML += card;
        });
    });
}

// Funções de ação reais no banco de dados
async function mudarStatus(id, novoStatus) {
    const docRef = window.doc(window.db, "comunicados", id);
    await window.updateDoc(docRef, { status: novoStatus });
    alert("Status atualizado!");
}

async function excluirCP(id) {
    if (confirm("Deseja realmente excluir este registro permanentemente?")) {
        const docRef = window.doc(window.db, "comunicados", id);
        await window.deleteDoc(docRef);
    }
}

function gerarBotaoAcao(id, status, nome) {
    if (status === 'pendente') 
        return `<button class="btn-small" onclick="mudarStatus('${id}', 'assinado')">Ver e Assinar</button>`;
    if (status === 'assinado') 
        return `<button class="btn-small" style="background:#2e7d32;" onclick="mudarStatus('${id}', 'enviado')">Enviar ao RH</button>`;
    if (status === 'enviado') 
        return `<button class="btn-small" style="background:#d32f2f;" onclick="excluirCP('${id}')">Excluir</button>`;
}

// Inicializa
document.addEventListener('DOMContentLoaded', () => filtrar('pendente'));