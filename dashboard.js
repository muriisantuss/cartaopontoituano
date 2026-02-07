import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = getAuth();

// Verificação de Segurança
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

// Tornar funções de ação globais (para o onclick do HTML funcionar)
window.mudarStatus = async function(id, novoStatus) {
    const docRef = window.doc(window.db, "comunicados", id);
    await window.updateDoc(docRef, { status: novoStatus });
    alert("Status atualizado!");
};

window.excluirCP = async function(id) {
    if (confirm("Deseja realmente excluir este registro permanentemente?")) {
        const docRef = window.doc(window.db, "comunicados", id);
        await window.deleteDoc(docRef);
    }
};

window.filtrar = function(statusAlvo) {
    const listaElemento = document.getElementById('cp-list');
    const botoes = document.querySelectorAll('.filter-btn');
    
    botoes.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(statusAlvo)) btn.classList.add('active');
    });

    if (window.unsub) window.unsub();

    const q = window.query(
        window.collection(window.db, "comunicados"), 
        window.where("status", "==", statusAlvo)
    );

    window.unsub = window.onSnapshot(q, (snapshot) => {
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
                        ${gerarBotaoAcao(id, item.status)}
                    </div>
                </div>
            `;
            listaElemento.innerHTML += card;
        });
    });
};

function gerarBotaoAcao(id, status) {
    if (status === 'pendente') 
        return `<button class="btn-small" onclick="mudarStatus('${id}', 'assinado')">Ver e Assinar</button>`;
    if (status === 'assinado') 
        return `<button class="btn-small" style="background:#2e7d32;" onclick="mudarStatus('${id}', 'enviado')">Enviar ao RH</button>`;
    if (status === 'enviado') 
        return `<button class="btn-small" style="background:#d32f2f;" onclick="excluirCP('${id}')">Excluir</button>`;
}

// Inicializa quando o Firebase estiver pronto no window
window.addEventListener('firebaseReady', () => {
    window.filtrar('pendente');
});