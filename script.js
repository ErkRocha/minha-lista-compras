// SCRIPT.JS: Arquivo script.js carregado e interpretado.
console.log("SCRIPT.JS: Arquivo script.js carregado e interpretado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT.JS: Evento DOMContentLoaded disparado."); // LOG A

    // --- Seletores de Elementos ---
    const itemInput = document.getElementById('itemInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const feedbackMessageContainer = document.getElementById('feedbackMessage');
    const categorySelect = document.getElementById('categorySelect');

    const shoppingListUL = document.getElementById('shoppingList');
    const filterInput = document.getElementById('filterInput');
    const clearCategoryBtn = document.getElementById('clearCategoryBtn');
    const emptyListMessage = document.getElementById('emptyListMessage');
    const categoryTabsContainer = document.getElementById('categoryTabs');
    const currentYearSpan = document.getElementById('currentYear');

    // --- Configuração da API ---
    const apiUrlBase = "https://t7gqeja237.execute-api.us-east-1.amazonaws.com/v1"; // Certifique-se que esta é sua URL correta
    console.log("SCRIPT.JS: apiUrlBase definida como:", apiUrlBase); // LOG B


    // --- Dados e Estado do Frontend ---
    const categoriasDisponiveis = ["mercado", "farmácia", "petshop", "casa", "escritório", "feira", "outros"];
    let todasAsListas = {}; // Vai armazenar { mercado: [itens], farmacia: [itens], ... }
    let categoriaAtiva = localStorage.getItem('categoriaAtiva') || categoriasDisponiveis[0];
    let semanaIdAtiva = ''; // Será definida ao carregar, ex: "2025-S19"
    let currentFilter = '';

    // --- Funções Auxiliares ---
    function saveActiveCategoryState() {
        if (semanaIdAtiva) {
            localStorage.setItem(`categoriaAtiva_${semanaIdAtiva}`, categoriaAtiva);
        }
    }

    function loadActiveCategoryState() {
        if (semanaIdAtiva) {
            categoriaAtiva = localStorage.getItem(`categoriaAtiva_${semanaIdAtiva}`) || categoriasDisponiveis[0];
        } else {
            // Se semanaIdAtiva não estiver definida, usa a primeira categoria como padrão
            // ou a última categoria globalmente salva, se preferir.
            categoriaAtiva = localStorage.getItem('categoriaAtiva_global_fallback') || categoriasDisponiveis[0];
        }
    }
    
    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    function get_empty_list_data_frontend() {
        let emptyData = {};
        categoriasDisponiveis.forEach(cat => { emptyData[cat] = []; });
        return emptyData;
    }

    // Função helper para getCurrentWeekIdFrontend (pode precisar de ajustes para precisão ISO 8601 total em bordas de ano)
    function getCurrentWeekIdFrontend() {
        const today = new Date();
        const year = today.getFullYear();
        // Aproximação simples para número da semana.
        // A lógica do backend com isocalendar() é mais precisa para a norma ISO 8601.
        const firstDayOfYear = new Date(year, 0, 1);
        const dayNum = Math.floor((today - firstDayOfYear) / (24 * 60 * 60 * 1000)) + 1;
        let weekNum = Math.ceil(dayNum / 7);
        // Garante que seja no formato SNN
        return `${year}-S${String(weekNum).padStart(2, '0')}`;
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
            categorySelect.value = categoriaSalvaParaAdicionar;
             if (!categorySelect.value && categoriasDisponiveis.length > 0) {
                categorySelect.value = categoriasDisponiveis[0];
            }
        }
    }

    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = '';
        // const semanaIdExibicao = semanaIdAtiva ? ` (Semana: ${semanaIdAtiva})` : ''; // Pode adicionar à UI se desejar

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
                saveActiveCategoryState();
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

    // VERSÃO COM LOGS DE DEPURAÇÃO
    function renderListForActiveCategory() {
        if (!shoppingListUL) return;
        console.log("FRONTEND: [renderListForActiveCategory] Iniciando. Categoria Ativa:", categoriaAtiva); // LOG 8
        console.log("FRONTEND: [renderListForActiveCategory] 'todasAsListas' no momento da renderização:", JSON.parse(JSON.stringify(todasAsListas))); // LOG 9

        shoppingListUL.innerHTML = '';
        
        if (!todasAsListas || typeof todasAsListas[categoriaAtiva] === 'undefined') {
            console.error("FRONTEND: [renderListForActiveCategory] 'todasAsListas' está undefined ou a categoriaAtiva ('" + categoriaAtiva + "') não existe como chave em todasAsListas! Inicializando categoria em todasAsListas.");
            if (todasAsListas && typeof todasAsListas !== 'object') todasAsListas = {}; // Garante que todasAsListas seja um objeto
            if (!todasAsListas) todasAsListas = {};
             todasAsListas[categoriaAtiva] = []; // Define como array vazio para evitar mais erros
        }
        
        const itensDaCategoriaAtiva = todasAsListas[categoriaAtiva] || []; 
        console.log("FRONTEND: [renderListForActiveCategory] Itens para a categoria ativa ('" + categoriaAtiva + "'):", JSON.parse(JSON.stringify(itensDaCategoriaAtiva))); // LOG 10
        
        const filteredItems = itensDaCategoriaAtiva.filter(item =>
            item && item.name && typeof item.name === 'string' && 
            item.name.toLowerCase().includes(currentFilter.toLowerCase())
        );
        console.log("FRONTEND: [renderListForActiveCategory] Itens filtrados para renderizar:", JSON.parse(JSON.stringify(filteredItems))); // LOG 11

        if (itensDaCategoriaAtiva.length === 0) {
            if (emptyListMessage) {
                emptyListMessage.textContent = `A categoria "${categoriaAtiva.charAt(0).toUpperCase() + categoriaAtiva.slice(1)}" está vazia para a semana ${semanaIdAtiva || 'desconhecida'}!`;
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
            if (!item || typeof item.id_interno === 'undefined' || typeof item.categoria === 'undefined' || typeof item.name === 'undefined') {
                console.error("FRONTEND: [renderListForActiveCategory] Tentando renderizar um item malformado ou undefined:", item);
                return; 
            }
            console.log("FRONTEND: [renderListForActiveCategory] Renderizando item:", JSON.parse(JSON.stringify(item))); // LOG 12
            
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            listItem.dataset.itemid = item.id_interno; 
            listItem.dataset.categoria = item.categoria; 

            if (item.comprado) {
                listItem.classList.add('comprado');
            }

            const itemNameSpan = document.createElement('span');
            itemNameSpan.classList.add('item-name');
            itemNameSpan.textContent = item.name;
            itemNameSpan.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (li && li.dataset.categoria && li.dataset.itemid) {
                    toggleComprado(li.dataset.categoria, li.dataset.itemid);
                } else {
                    console.error("FRONTEND: [itemNameSpan click] Não foi possível obter categoria ou itemid do elemento li:", li);
                }
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

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger', 'btn-remove');
            removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
            removeBtn.title = 'Remover item';

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
            feedbackMessageContainer.appendChild(alertDiv);
            
            setTimeout(() => {
                const activeAlert = document.getElementById(alertId);
                if(activeAlert){
                    const bsAlert = bootstrap.Alert.getInstance(activeAlert);
                    if (bsAlert) {
                        bsAlert.close();
                    } else { 
                        activeAlert.remove();
                    }
                }
            }, 5000);
        }
    }

    // --- Funções de Interação com API ---

    // VERSÃO COM LOGS DE DEPURAÇÃO
    async function carregarItensDaSemana(semanaId = 'atual') {
        const url = `${apiUrlBase}/listas/${semanaId}`;
        console.log("FRONTEND: [carregarItensDaSemana] Chamando API:", url); // LOG 1
        showFeedback(`Carregando lista para semana ${semanaId}...`, 'info');
        try {
            const response = await fetch(url);
            console.log("FRONTEND: [carregarItensDaSemana] Resposta crua do fetch:", response); // LOG 2

            if (!response.ok) {
                let errorText = response.statusText;
                let errorDataFromServer = {};
                try {
                    errorDataFromServer = await response.json(); 
                    errorText = errorDataFromServer.error || errorDataFromServer.message || response.statusText;
                    console.error("FRONTEND: [carregarItensDaSemana] Dados do erro JSON:", errorDataFromServer); // LOG ERRO DETALHADO
                } catch (e) { 
                    console.error("FRONTEND: [carregarItensDaSemana] Não foi possível parsear JSON do erro, usando statusText. Erro parse:", e);
                }
                throw new Error(`Erro ${response.status}: ${errorText}`);
            }

            const backendResponse = await response.json();
            console.log("FRONTEND: [carregarItensDaSemana] Dados JSON recebidos do backend:", JSON.stringify(backendResponse, null, 2)); // LOG 3

            if (backendResponse && backendResponse.semanaIdUtilizada && backendResponse.dadosAgrupados) {
                semanaIdAtiva = backendResponse.semanaIdUtilizada;
                console.log("FRONTEND: [carregarItensDaSemana] semanaIdAtiva definida para:", semanaIdAtiva); // LOG 4
                todasAsListas = backendResponse.dadosAgrupados;
            } else if (semanaId !== 'atual' && backendResponse && !backendResponse.semanaIdUtilizada && !backendResponse.dadosAgrupados) { 
                // Se pediu semana específica E o backend retornou diretamente o objeto de dados agrupados (sem o wrapper)
                semanaIdAtiva = semanaId;
                todasAsListas = backendResponse; 
                console.log("FRONTEND: [carregarItensDaSemana] semanaIdAtiva (específica):", semanaIdAtiva, "Usando dados diretos do backend (sem wrapper)."); // LOG 5
            } else { 
                 console.warn("FRONTEND: [carregarItensDaSemana] Backend não retornou a estrutura esperada (semanaIdUtilizada ou dadosAgrupados). Verifique a resposta do backend no LOG 3. Tentando usar backendResponse como dados agrupados se não for null/undefined.");
                 semanaIdAtiva = (backendResponse && backendResponse.semanaIdUtilizada) ? backendResponse.semanaIdUtilizada : getCurrentWeekIdFrontend();
                 todasAsListas = (backendResponse && backendResponse.dadosAgrupados) ? backendResponse.dadosAgrupados : ( (backendResponse && Object.keys(backendResponse).length > 0 && typeof backendResponse.semanaIdUtilizada === 'undefined' ) ? backendResponse : get_empty_list_data_frontend() );
                 console.log("FRONTEND: [carregarItensDaSemana] Usando fallback. semanaIdAtiva:", semanaIdAtiva); // LOG 6
            }
            console.log("FRONTEND: [carregarItensDaSemana] Objeto 'todasAsListas' final:", JSON.parse(JSON.stringify(todasAsListas))); // LOG 7

            categoriasDisponiveis.forEach(cat => {
                if (!todasAsListas[cat]) {
                    todasAsListas[cat] = [];
                }
            });
            
            loadActiveCategoryState(); 
            
            if (document.getElementById('categoryTabs')) {
                renderCategoryTabs(); 
                updateActiveTabStatesVisual();
                renderListForActiveCategory(); 
            }
            popularDropdownCategorias();
            showFeedback(`Lista para semana ${semanaIdAtiva} carregada!`, "success");

        } catch (error) {
            console.error(`FRONTEND: [carregarItensDaSemana] Falha CRÍTICA ao carregar itens para ${semanaId}:`, error); // LOG ERRO
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
        console.log("FRONTEND: [adicionarItemHandler] Adicionando item. URL:", url, "Dados:", {nomeItem});
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nomeItem: nomeItem })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({error: `Erro ${response.status} ao adicionar.`}));
                throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao adicionar item.'}`);
            }
            const itemAdicionadoDoBackend = await response.json();
            console.log("FRONTEND: [adicionarItemHandler] Item adicionado no backend:", itemAdicionadoDoBackend);

            if (!todasAsListas[itemAdicionadoDoBackend.categoria]) {
                todasAsListas[itemAdicionadoDoBackend.categoria] = [];
            }
            todasAsListas[itemAdicionadoDoBackend.categoria].push({
                id_interno: itemAdicionadoDoBackend.id_interno,
                name: itemAdicionadoDoBackend.name,
                comprado: itemAdicionadoDoBackend.comprado,
                categoria: itemAdicionadoDoBackend.categoria,
                categoriaItemID_completo: itemAdicionadoDoBackend.categoriaItemID_completo
            });
            
            localStorage.setItem('ultimaCategoriaAdicionada', categoriaSelecionada);
            if (categoriaSelecionada === categoriaAtiva) {
                renderListForActiveCategory();
            }
            showFeedback(`"${itemAdicionadoDoBackend.name}" adicionado à categoria ${itemAdicionadoDoBackend.categoria}!`, 'success');
            itemInput.value = '';
            itemInput.focus();

        } catch (error) {
            console.error("FRONTEND: [adicionarItemHandler] Falha ao adicionar item:", error);
            showFeedback(error.message || "Erro ao adicionar item.", "danger");
        }
    }

    async function toggleComprado(categoria, itemIdInterno) {
        const item = todasAsListas[categoria]?.find(i => i.id_interno === itemIdInterno);
        if (!item || !semanaIdAtiva) {
            console.warn("FRONTEND: [toggleComprado] Item não encontrado ou semanaIdAtiva não definida.", {categoria, itemIdInterno, semanaIdAtiva});
            return;
        }

        const novoEstadoComprado = !item.comprado;
        const url = `${apiUrlBase}/listas/${semanaIdAtiva}/categorias/${categoria}/items/${itemIdInterno}`;
        console.log("FRONTEND: [toggleComprado] Atualizando item. URL:", url, "Novo estado:", {comprado: novoEstadoComprado});
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comprado: novoEstadoComprado })
            });
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({error: `Erro ${response.status} ao atualizar.`}));
                 throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao atualizar item.'}`);
            }
            
            item.comprado = novoEstadoComprado;
            if (categoria === categoriaAtiva) {
                renderListForActiveCategory();
            }
        } catch (error) {
            console.error("FRONTEND: [toggleComprado] Falha ao atualizar item:", error);
            showFeedback(error.message || "Erro ao atualizar item.", "danger");
        }
    }

    async function removerItem(categoria, itemIdInterno) {
        const itemParaRemover = todasAsListas[categoria]?.find(i=>i.id_interno === itemIdInterno);
        if (!semanaIdAtiva || !itemParaRemover || !confirm(`Remover "${itemParaRemover.name}" da lista?`)) return;

        const url = `${apiUrlBase}/listas/${semanaIdAtiva}/categorias/${categoria}/items/${itemIdInterno}`;
        console.log("FRONTEND: [removerItem] Removendo item. URL:", url);
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({error: `Erro ${response.status} ao remover.`}));
                throw new Error(`Erro ${response.status}: ${errData.error || 'Falha ao remover item.'}`);
            }

            todasAsListas[categoria] = todasAsListas[categoria]?.filter(i => i.id_interno !== itemIdInterno);
            if (categoria === categoriaAtiva) {
                renderListForActiveCategory();
            }
            showFeedback("Item removido.", "info");
        } catch (error) {
            console.error("FRONTEND: [removerItem] Falha ao remover item:", error);
            showFeedback(error.message || "Erro ao remover item.", "danger");
        }
    }
    
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

    if (shoppingListUL) {
        shoppingListUL.addEventListener('click', function(event) {
            const targetButton = event.target.closest('button');
            if (!targetButton) return;

            const listItem = targetButton.closest('li');
            if (!listItem) return;

            const itemId = listItem.dataset.itemid;
            const categoria = listItem.dataset.categoria;

            // Adicionada verificação para garantir que itemId e categoria não são undefined
            if (typeof itemId === 'undefined' || typeof categoria === 'undefined') {
                console.error("FRONTEND: [shoppingListUL click] itemId ou categoria undefined nos data-attributes.", {itemId, categoria, listItem});
                return;
            }

            if (targetButton.classList.contains('btn-toggle-bought')) {
                toggleComprado(categoria, itemId);
            } else if (targetButton.classList.contains('btn-remove')) {
                removerItem(categoria, itemId);
            }
        });
    }

    // --- Inicialização ---
    console.log("SCRIPT.JS: Prestes a chamar updateCurrentYear.");
    updateCurrentYear();
    console.log("SCRIPT.JS: Prestes a chamar carregarItensDaSemana('atual')."); // LOG C
    carregarItensDaSemana('atual'); 
    console.log("SCRIPT.JS: Chamada para carregarItensDaSemana('atual') realizada."); // LOG D
});