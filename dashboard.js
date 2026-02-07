// Simulação de banco de dados (Mock Data)
let dadosCP = [
    { id: 1, nome: "João Silva", data: "07/02/2026", hora: "14:30", status: "pendente" },
    { id: 2, nome: "Ana Carolina", data: "06/02/2026", hora: "09:15", status: "assinado" },
    { id: 3, nome: "Ricardo Santos", data: "05/02/2026", hora: "10:00", status: "enviado" },
    { id: 4, nome: "Maria Oliveira", data: "07/02/2026", hora: "11:20", status: "pendente" }
];

function filtrar(statusAlvo) {
    const listaElemento = document.getElementById('cp-list');
    const botoes = document.querySelectorAll('.filter-btn');
    
    // Atualizar visual dos botões
    botoes.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(statusAlvo)) {
            btn.classList.add('active');
        }
    });

    listaElemento.innerHTML = "";

    // Filtrar dados do Array
    const filtrados = dadosCP.filter(item => item.status === statusAlvo);

    if (filtrados.length === 0) {
        listaElemento.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">Nenhum item encontrado como "${statusAlvo}".</p>`;
        return;
    }

    filtrados.forEach(item => {
        const card = `
            <div class="cp-card" id="card-${item.id}">
                <div class="card-info">
                    <strong>${item.nome}</strong>
                    <span>Enviado em: ${item.data} - ${item.hora}</span>
                </div>
                <div class="card-actions">
                    ${gerarBotaoAcao(item)}
                </div>
            </div>
        `;
        listaElemento.innerHTML += card;
    });
}

function gerarBotaoAcao(item) {
    if (item.status === 'pendente') 
        return `<button class="btn-small" onclick="alert('Abrindo para assinar...')">Ver e Assinar</button>`;
    
    if (item.status === 'assinado') 
        return `<button class="btn-small" style="background: #2e7d32;" onclick="enviarAoRH(${item.id})">Enviar para RH</button>`;
    
    if (item.status === 'enviado') 
        return `<button class="btn-small" style="background: #d32f2f;" onclick="removerCP(${item.id})">Excluir</button>`;
    
    return '';
}

// Lógica de Exclusão (Praticando .filter)
function removerCP(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
        dadosCP = dadosCP.filter(item => item.id !== id);
        filtrar('enviado'); // Recarrega a lista de enviados
    }
}

// Lógica de Mudança de Status (Workflow)
function enviarAoRH(id) {
    const cp = dadosCP.find(item => item.id === id);
    if (cp) {
        cp.status = 'enviado';
        alert(`O documento de ${cp.nome} foi enviado com sucesso para o RH!`);
        filtrar('assinado'); // Recarrega a lista de assinados (o item sumirá daqui)
    }
}

document.addEventListener('DOMContentLoaded', () => filtrar('pendente'));