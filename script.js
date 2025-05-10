document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos (mantêm-se os mesmos) ---
    const itemInput = document.getElementById('itemInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const feedbackMessageContainer = document.getElementById('feedbackMessage');
    const categorySelect = document.getElementById('categorySelect');

    const shoppingListUL = document.getElementById('shoppingList');
    const filterInput = document.getElementById('filterInput');
    const clearCategoryBtn = document.getElementById('clearCategoryBtn'); // Funcionalidade a ser reavaliada com o novo backend
    const emptyListMessage = document.getElementById('emptyListMessage');
    const categoryTabsContainer = document.getElementById('categoryTabs');
    const currentYearSpan = document.getElementById('currentYear');

    // --- Configuração da API ---
    const apiUrlBase = "https://t7gqeja237.execute-api.us-east-1.amazonaws.com/v1";


    // --- Dados e Estado do Frontend ---
    const categoriasDisponiveis = ["mercado", "farmácia", "petshop", "casa", "escritório", "feira", "outros"];
    let todasAsListas = {}; // Vai armazenar { mercado: [itens], farmacia: [itens], ... }
    let categoriaAtiva = localStorage.getItem('categoriaAtiva') || categoriasDisponiveis[0];
    let semanaIdAtiva = ''; // Será definida ao carregar, ex: "2025-S19"
    let currentFilter = '';

    // --- Funções Auxiliares ---
    function saveActiveCategoryState() {
        // Salva a categoria ativa para a semanaIdAtiva, para persistir a aba selecionada
        if (semanaIdAtiva) {
            localStorage.setItem(`categoriaAtiva_${semanaIdAtiva}`, categoriaAtiva);
        }
    }

    function loadActiveCategoryState() {
        if (semanaIdAtiva) {
            categoriaAtiva = localStorage.getItem(`categoriaAtiva_${semanaIdAtiva}`) || categoriasDisponiveis[0];
        } else {
            categoriaAtiva = categoriasDisponiveis[0];
        }
    }
    
    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    // Helper no frontend para estrutura vazia
    function get_empty_list_data_frontend() {
        let emptyData = {};
        categoriasDisponiveis.forEach(cat => { emptyData[cat] = []; });
        return emptyData;
    }

    function popularDropdownCategorias() {
        if (categorySelect) {
            const categoriaSalvaParaAdicionar = localStorage.getItem('ultimaCategoriaAdicionada') || categoriaAtiva;
            categorySelect.innerHTML = '<option value="" disabled>Selecione uma categoria...</option>';
            categoriasDisponiveis.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                categorySelect.appendChild(option);
            });
            categorySelect.value = categoriaSalvaParaAdicionar; // Pré-seleciona
             if (!categorySelect.value && categoriasDisponiveis.length > 0) { // Garante que algo esteja selecionado se possível
                categorySelect.value = categoriasDisponiveis[0];
            }
        }
    }

    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = '';
        const semanaIdExibicao = semanaIdAtiva ? ` (Semana: ${semanaIdAtiva})` : '';
        // Poderia adicionar um título para a semana aqui ou no H1 da página de listas.

        categoriasDisponiveis.forEach(cat => {
            const navItem = document.createElement('li');
            navItem.classList.add('nav-item');
            const tabButton = document.createElement('button');
            tabButton.classList.add('nav-link');
            tabButton.dataset.category = cat;
            tabButton.type = 'button';
            tabButton.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            if (cat === categoriaAtiva) {
                tabButton.classList.add('active');
                tabButton.setAttribute('aria-current', 'page');
            }
            tabButton.addEventListener('click', () => {
                categoriaAtiva = cat;
                saveActiveCategoryState(); // Salva estado da aba para a semana atual
                currentFilter = '';
                if (filterInput) filterInput.value = '';
                renderListForActiveCategory();
                updateActiveTabStatesVisual();
            });
            navItem.appendChild(tabButton);
            categoryTabsContainer.appendChild(navItem);
        });
    }

    function updateActiveTabStatesVisual() {
        if (!categoryTabsContainer) return;
        document.querySelectorAll('#categoryTabs .nav-link').forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
            if (btn.dataset.category === categoriaAtiva) {
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'page');
            }
        });
    }

    function renderListForActiveCategory() {
        if (!shoppingListUL) return;

        shoppingListUL.innerHTML = '';
        const itensDaCategoriaAtiva = todasAsListas[categoriaAtiva] || [];
        const filteredItems = itensDaCategoriaAtiva.filter(item =>
            item.name.toLowerCase().includes(currentFilter.toLowerCase())
        );

        if (itensDaCategoriaAtiva.length === 0) {
            if (emptyListMessage) {
                emptyListMessage.textContent = `A categoria "${categoriaAtiva.charAt(0).toUpperCase() + categoriaAtiva.slice(1)}" está vazia para a semana ${semanaIdAtiva || 'atual'}!`;
                emptyListMessage.style.display = 'block';
            }
        } else if (filteredItems.length === 0 && currentFilter) {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'text-muted');
            li.textContent = 'Nenhum item encontrado com este filtro nesta categoria.';
            shoppingListUL.appendChild(li);
            if (emptyListMessage) emptyListMessage.style.display = 'none';
        } else {
            if (emptyListMessage) emptyListMessage.style.display = 'none';
        }

        filteredItems.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            // Adicionar data-attributes para identificar o item e sua categoria
            listItem.dataset.itemid = item.id_interno; // O UUID do item
            listItem.dataset.categoria = item.categoria; // A categoria do item

            if (item.comprado) {
                listItem.classList.add('comprado');
            }

            const itemNameSpan = document.createElement('span');
            itemNameSpan.classList.add('item-name');
            itemNameSpan.textContent = item.name;
            // O evento de clique no nome do item agora também pode usar os data-attributes do LI
            itemNameSpan.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                toggleComprado(li.dataset.categoria, li.dataset.itemid);
            });


            const actionsDiv = document.createElement('div');
            const toggleBtn = document.createElement('button');
            toggleBtn.classList.add('btn', 'btn-sm', 'me-2', 'btn-toggle-bought');
            toggleBtn.title = item.comprado ? 'Marcar como não comprado' : 'Marcar como comprado';
            if (item.comprado) {
                toggleBtn.classList.add('btn-success');
                toggleBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i>';
            } else {
                toggleBtn.classList.add('btn-outline-success');
                toggleBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
            }
            // Event listener será delegado à UL

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger', 'btn-remove');
            removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
            removeBtn.title = 'Remover item';
            // Event listener será delegado à UL

            actionsDiv.appendChild(toggleBtn);
            actionsDiv.appendChild(removeBtn);
            listItem.appendChild(itemNameSpan);
            listItem.appendChild(actionsDiv);
            shoppingListUL.appendChild(listItem);
        });
    }

    function showFeedback(message, type = 'info') {
        if (feedbackMessageContainer) {
            const alertType = type === 'error' ? 'danger' : type;
            const alertId = `feedbackAlert-${Date.now()}`;
            const alertDiv = document.createElement('div');
            alertDiv.id = alertId;
            alertDiv.className = `alert alert-${alertType} alert-dismissible fade show mt-3`;
            alertDiv.setAttribute('role', 'alert');
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            // Limpa mensagens antigas antes de adicionar uma nova para não acumular.
            // feedbackMessageContainer.innerHTML = ''; (Removido para permitir múltiplas mensagens se necessário, mas com auto-dismiss)
            feedbackMessageContainer.appendChild(alertDiv);
            
            // Auto-dismiss após 5 segundos
            setTimeout(() => {
                const activeAlert = document.getElementById(alertId);
                if(activeAlert){
                    const bsAlert = bootstrap.Alert.getInstance(activeAlert);
                    if (bsAlert) {
                        bsAlert.close();
                    } else { // Fallback se o JS do Bootstrap não fechar
                        activeAlert.remove();
                    }
                }
            }, 5000);
        }
    }

    // --- Funções de Interação com API ---

    async function carregarItensDaSemana(semanaId = 'atual') {
        const url = `${apiUrlBase}/listas/${semanaId}`;
        showFeedback(`Carregando lista para semana ${semanaId}...`, 'info');
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Erro ${response.status}: ${errorData.error || response.statusText}`);
            }
            const backendResponse = await response.json(); // Espera { semanaIdUtilizada: "...", dadosAgrupados: {...} }
            
            // MODIFICAÇÃO IMPORTANTE: Esperar que o backend retorne qual semana foi usada para 'atual'
            if (backendResponse && backendResponse.semanaIdUtilizada) {
                semanaIdAtiva = backendResponse.semanaIdUtilizada;
                todasAsListas = backendResponse.dadosAgrupados || get_empty_list_data_frontend();
            } else if (semanaId !== 'atual') { // Se pediu semana específica e obteve dados
                semanaIdAtiva = semanaId;
                todasAsListas = backendResponse || get_empty_list_data_frontend(); // Backend retorna direto os dadosAgrupados
            } else { // Fallback se 'atual' não retornou semanaIdUtilizada
                 semanaIdAtiva = (new Date()).getFullYear() + "-S" + String(Math.ceil((((new Date()) - new Date((new Date()).getFullYear(),0,1)) / 86400000 + new Date((new Date()).getFullYear(),0,1).getDay()+1)/7)).padStart(2,'0'); // Cálculo simples, melhor se backend informar
                 todasAsListas = backendResponse || get_empty_list_data_frontend();
            }

            // Garante que todas as categorias locais existam
            categoriasDisponiveis.forEach(cat => {
                if (!todasAsListas[cat]) {
                    todasAsListas[cat] = [];
                }
            });
            
            loadActiveCategoryState(); // Carrega a aba ativa para a semana carregada
            if (document.getElementById('categoryTabs')) {
                renderCategoryTabs(); // Renderiza abas
                updateActiveTabStatesVisual(); // Garante que a aba correta está ativa visualmente
                renderListForActiveCategory(); // Renderiza itens para a categoria ativa
            }
            popularDropdownCategorias(); // Popula dropdown de categorias
            showFeedback(`Lista para semana ${semanaIdAtiva} carregada!`, "success");

        } catch (error) {
            console.error(`Falha ao carregar itens para ${semanaId}:`, error);
            showFeedback(error.message || "Não foi possível carregar seus itens.", "danger");
            todasAsListas = get_empty_list_data_frontend();
            if (document.getElementById('categoryTabs')) {
                 renderCategoryTabs(); renderListForActiveCategory();
            }
            popularDropdownCategorias();
        }
    }

    async function adicionarItemHandler() {
        if (!itemInput || !categorySelect) return;

        const nomeItem = itemInput.value.trim();
        const categoriaSelecionada = categorySelect.value;

        if (nomeItem === '') {
            showFeedback('Por favor, digite o nome do item.', 'warning');
            itemInput.focus();
            return;
        }
        if (!categoriaSelecionada) {
            showFeedback('Por favor, selecione uma categoria.', 'warning');
            categorySelect.focus();
            return;
        }
        if (!semanaIdAtiva) {
            showFeedback("Não foi possível determinar a semana ativa. Recarregue a página.", "danger");
            return;
        }

        const url = `${apiUrlBase}/listas/${semanaIdAtiva}/categorias/${categoriaSelecionada}/items`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nomeItem: nomeItem })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao adicionar item.'}`);
            }
            const itemAdicionadoDoBackend = await response.json();

            // Adicionar o item à 'todasAsListas' localmente
            if (!todasAsListas[itemAdicionadoDoBackend.categoria]) {
                todasAsListas[itemAdicionadoDoBackend.categoria] = [];
            }
            // O item do backend já vem com id_interno, name, comprado, categoria
            todasAsListas[itemAdicionadoDoBackend.categoria].push({
                id_interno: itemAdicionadoDoBackend.id_interno,
                name: itemAdicionadoDoBackend.name,
                comprado: itemAdicionadoDoBackend.comprado,
                categoria: itemAdicionadoDoBackend.categoria, // Garantir que a categoria está no item local
                categoriaItemID_completo: itemAdicionadoDoBackend.categoriaItemID_completo // Opcional
            });
            
            localStorage.setItem('ultimaCategoriaAdicionada', categoriaSelecionada);
            if (categoriaSelecionada === categoriaAtiva) {
                renderListForActiveCategory(); // Re-renderiza apenas se a categoria ativa foi modificada
            }
            showFeedback(`"${itemAdicionadoDoBackend.name}" adicionado à categoria ${itemAdicionadoDoBackend.categoria}!`, 'success');
            itemInput.value = '';
            itemInput.focus();

        } catch (error) {
            console.error("Falha ao adicionar item:", error);
            showFeedback(error.message || "Erro ao adicionar item.", "danger");
        }
    }

    async function toggleComprado(categoria, itemIdInterno) {
        const item = todasAsListas[categoria]?.find(i => i.id_interno === itemIdInterno);
        if (!item || !semanaIdAtiva) return;

        const novoEstadoComprado = !item.comprado;
        const url = `${apiUrlBase}/listas/${semanaIdAtiva}/categorias/${categoria}/items/${itemIdInterno}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comprado: novoEstadoComprado })
            });
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({}));
                 throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao atualizar item.'}`);
            }
            
            item.comprado = novoEstadoComprado; // Atualiza localmente
            if (categoria === categoriaAtiva) { // Re-renderiza a lista se for da categoria ativa
                renderListForActiveCategory();
            }
        } catch (error) {
            console.error("Falha ao atualizar item:", error);
            showFeedback(error.message || "Erro ao atualizar item.", "danger");
        }
    }

    async function removerItem(categoria, itemIdInterno) {
        if (!semanaIdAtiva || !confirm(`Remover "${todasAsListas[categoria]?.find(i=>i.id_interno === itemIdInterno)?.name}" da lista?`)) return;

        const url = `${apiUrlBase}/listas/${semanaIdAtiva}/categorias/${categoria}/items/${itemIdInterno}`;
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao remover item.'}`);
            }

            // Remove localmente
            todasAsListas[categoria] = todasAsListas[categoria]?.filter(i => i.id_interno !== itemIdInterno);
            if (categoria === categoriaAtiva) { // Re-renderiza a lista se for da categoria ativa
                renderListForActiveCategory();
            }
            showFeedback("Item removido.", "info");
        } catch (error) {
            console.error("Falha ao remover item:", error);
            showFeedback(error.message || "Erro ao remover item.", "danger");
        }
    }
    
    // Função de limpar categoria precisa ser adaptada ou removida,
    // pois agora os itens são individuais. Limpar significaria deletar todos os itens um por um
    // ou ter um endpoint de backend específico para "limpar categoria da semana".
    // Por simplicidade, vamos comentar o event listener por enquanto.
    // if (clearCategoryBtn) {
    //     clearCategoryBtn.addEventListener('click', () => {
    //         if(!semanaIdAtiva || !categoriaAtiva) return;
    //         if (confirm(`Tem certeza que deseja remover TODOS os itens da categoria "${categoriaAtiva}" para a semana ${semanaIdAtiva}?`)) {
    //             // TODO: Implementar a lógica de deletar múltiplos itens via backend,
    //             // ou iterar e chamar removerItem para cada um.
    //             console.warn("Funcionalidade de limpar categoria não totalmente implementada para o novo backend.");
    //         }
    //     });
    // }


    // --- Event Listeners ---
    if (addItemBtn) {
        addItemBtn.addEventListener('click', adicionarItemHandler);
    }
    if (itemInput) {
        itemInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                adicionarItemHandler();
            }
        });
    }
    if (filterInput) {
        filterInput.addEventListener('input', (event) => {
            currentFilter = event.target.value;
            if (shoppingListUL) renderListForActiveCategory();
        });
    }

    // Delegação de eventos para botões na lista de compras
    if (shoppingListUL) {
        shoppingListUL.addEventListener('click', function(event) {
            const targetButton = event.target.closest('button');
            if (!targetButton) return;

            const listItem = targetButton.closest('li');
            if (!listItem) return;

            const itemId = listItem.dataset.itemid;
            const categoria = listItem.dataset.categoria;

            if (targetButton.classList.contains('btn-toggle-bought')) {
                toggleComprado(categoria, itemId);
            } else if (targetButton.classList.contains('btn-remove')) {
                removerItem(categoria, itemId);
            }
        });
    }

    // --- Inicialização ---
    updateCurrentYear();
    // Define a semanaIdAtiva inicial e carrega os dados.
    // Poderia ter um seletor de semana na UI para o usuário mudar 'semanaIdAtiva'
    // e então chamar carregarItensDaSemana(novaSemanaId).
    // Por enquanto, sempre carrega "atual".
    carregarItensDaSemana('atual');
});