document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos Comuns ---
    const itemInput = document.getElementById('itemInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const feedbackMessageContainer = document.getElementById('feedbackMessage'); // Container para alertas Bootstrap
    const categorySelect = document.getElementById('categorySelect');

    const shoppingListUL = document.getElementById('shoppingList');
    const filterInput = document.getElementById('filterInput');
    const clearCategoryBtn = document.getElementById('clearCategoryBtn');
    const emptyListMessage = document.getElementById('emptyListMessage'); // Agora é um alert Bootstrap
    const categoryTabsContainer = document.getElementById('categoryTabs');
    const currentYearSpan = document.getElementById('currentYear');

    // --- Dados e Estado ---
    const categoriasDisponiveis = ["mercado", "farmácia", "petshop", "casa", "escritório", "feira", "outros"];
    let todasAsListas = JSON.parse(localStorage.getItem('todasAsListas')) || {};
    categoriasDisponiveis.forEach(cat => {
        if (!todasAsListas[cat]) {
            todasAsListas[cat] = [];
        }
    });

    let categoriaAtiva = localStorage.getItem('categoriaAtiva') || categoriasDisponiveis[0];
    let currentFilter = '';

    // --- Funções ---
    function saveLists() {
        localStorage.setItem('todasAsListas', JSON.stringify(todasAsListas));
    }

    function saveActiveCategory() {
        localStorage.setItem('categoriaAtiva', categoriaAtiva);
    }

    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    function popularDropdownCategorias() {
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="" selected disabled>Selecione uma categoria...</option>';
            categoriasDisponiveis.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                categorySelect.appendChild(option);
            });
            if (localStorage.getItem('categoriaAtiva')) {
                categorySelect.value = localStorage.getItem('categoriaAtiva');
            }
        }
    }

    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = '';
        categoriasDisponiveis.forEach(cat => {
            const navItem = document.createElement('li');
            navItem.classList.add('nav-item');

            const tabButton = document.createElement('button');
            tabButton.classList.add('nav-link');
            tabButton.dataset.category = cat;
            tabButton.type = 'button'; // Importante para botões em listas de navegação
            tabButton.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            if (cat === categoriaAtiva) {
                tabButton.classList.add('active');
                tabButton.setAttribute('aria-current', 'page');
            }
            tabButton.addEventListener('click', () => {
                categoriaAtiva = cat;
                saveActiveCategory();
                currentFilter = '';
                if (filterInput) filterInput.value = '';
                renderListForActiveCategory();
                updateActiveTabStates();
            });
            navItem.appendChild(tabButton);
            categoryTabsContainer.appendChild(navItem);
        });
    }

    function updateActiveTabStates() {
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
        const itensDaCategoria = todasAsListas[categoriaAtiva] || [];
        const filteredItems = itensDaCategoria.filter(item =>
            item.name.toLowerCase().includes(currentFilter.toLowerCase())
        );

        if (itensDaCategoria.length === 0) {
            if (emptyListMessage) {
                emptyListMessage.textContent = `A categoria "${categoriaAtiva.charAt(0).toUpperCase() + categoriaAtiva.slice(1)}" está vazia!`;
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
            const itemIndex = todasAsListas[categoriaAtiva].findIndex(original => original.id === item.id);

            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            if (item.comprado) {
                listItem.classList.add('comprado');
            }

            const itemNameSpan = document.createElement('span');
            itemNameSpan.classList.add('item-name'); // Classe para aplicar cursor e estilo
            itemNameSpan.textContent = item.name;
            itemNameSpan.addEventListener('click', () => toggleComprado(itemIndex));

            const actionsDiv = document.createElement('div');

            const toggleBtn = document.createElement('button');
            toggleBtn.classList.add('btn', 'btn-sm', 'me-2', 'btn-toggle-bought');
            toggleBtn.title = item.comprado ? 'Marcar como não comprado' : 'Marcar como comprado';
            if (item.comprado) {
                toggleBtn.classList.add('btn-success'); // Verde sólido se comprado
                toggleBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i>';
            } else {
                toggleBtn.classList.add('btn-outline-success'); // Borda verde se não comprado
                toggleBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
            }
            toggleBtn.addEventListener('click', () => toggleComprado(itemIndex));

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger', 'btn-remove');
            removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
            removeBtn.title = 'Remover item';
            removeBtn.addEventListener('click', () => removerItem(itemIndex));

            actionsDiv.appendChild(toggleBtn);
            actionsDiv.appendChild(removeBtn);
            listItem.appendChild(itemNameSpan);
            listItem.appendChild(actionsDiv);
            shoppingListUL.appendChild(listItem);
        });
    }

    function showFeedback(message, type = 'info') { // type: 'success', 'danger', 'warning', 'info'
        if (feedbackMessageContainer) {
            const alertType = type === 'error' ? 'danger' : type; // Mapeia 'error' para 'danger' do Bootstrap
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${alertType} alert-dismissible fade show mt-3`;
            alertDiv.setAttribute('role', 'alert');
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            feedbackMessageContainer.innerHTML = ''; // Limpa mensagens antigas
            feedbackMessageContainer.appendChild(alertDiv);

            // Auto-dismiss (opcional)
            // setTimeout(() => {
            //     const bootstrapAlert = bootstrap.Alert.getInstance(alertDiv);
            //     if (bootstrapAlert) {
            //         bootstrapAlert.close();
            //     }
            // }, 5000);
        }
    }


    function adicionarItemHandler() {
        if (!itemInput || !categorySelect) return;

        const itemName = itemInput.value.trim();
        const categoriaSelecionada = categorySelect.value;

        if (itemName === '') {
            showFeedback('Por favor, digite o nome do item.', 'warning');
            itemInput.focus();
            return;
        }
        if (!categoriaSelecionada) {
            showFeedback('Por favor, selecione uma categoria.', 'warning');
            categorySelect.focus();
            return;
        }

        if (!todasAsListas[categoriaSelecionada]) {
            todasAsListas[categoriaSelecionada] = [];
        }

        todasAsListas[categoriaSelecionada].push({ id: Date.now(), name: itemName, comprado: false });
        itemInput.value = '';
        // categorySelect.value = ''; // Opcional: resetar select ou manter a última categoria
        saveLists();
        categoriaAtiva = categoriaSelecionada; // Para conveniência, ir para a categoria do item adicionado
        saveActiveCategory();
        showFeedback(`"${itemName}" adicionado à categoria "${categoriaSelecionada.charAt(0).toUpperCase() + categoriaSelecionada.slice(1)}" com sucesso!`, 'success');
        itemInput.focus();
    }

    function toggleComprado(itemIndexNaCategoria) {
        const itensDaCategoria = todasAsListas[categoriaAtiva];
        if (itensDaCategoria && itemIndexNaCategoria >= 0 && itemIndexNaCategoria < itensDaCategoria.length) {
            itensDaCategoria[itemIndexNaCategoria].comprado = !itensDaCategoria[itemIndexNaCategoria].comprado;
            saveLists();
            renderListForActiveCategory();
        }
    }

    function removerItem(itemIndexNaCategoria) {
        const itensDaCategoria = todasAsListas[categoriaAtiva];
        if (itensDaCategoria && itemIndexNaCategoria >= 0 && itemIndexNaCategoria < itensDaCategoria.length) {
            const itemRemovido = itensDaCategoria.splice(itemIndexNaCategoria, 1);
            saveLists();
            renderListForActiveCategory();
            // showFeedback(`"${itemRemovido[0].name}" removido da lista.`, 'info'); // Feedback opcional
        }
    }

    function clearActiveCategoryItems() {
        const nomeCategoriaCapitalizada = categoriaAtiva.charAt(0).toUpperCase() + categoriaAtiva.slice(1);
        // Usar um modal do Bootstrap para confirmação seria mais elegante, mas `confirm` é mais simples por agora.
        if (confirm(`Tem certeza que deseja remover TODOS os itens da categoria "${nomeCategoriaCapitalizada}"?`)) {
            todasAsListas[categoriaAtiva] = [];
            saveLists();
            renderListForActiveCategory();
            showFeedback(`Todos os itens da categoria "${nomeCategoriaCapitalizada}" foram removidos.`, 'info');
        }
    }

    // --- Event Listeners ---
    if (addItemBtn) {
        addItemBtn.addEventListener('click', adicionarItemHandler);
    }
    if (itemInput) { // Permitir adicionar com Enter
        itemInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                adicionarItemHandler();
            }
        });
    }

    if (filterInput) {
        filterInput.addEventListener('input', (event) => {
            currentFilter = event.target.value;
            renderListForActiveCategory();
        });
    }
    if (clearCategoryBtn) {
        clearCategoryBtn.addEventListener('click', clearActiveCategoryItems);
    }

    // --- Inicialização ---
    updateCurrentYear();
    popularDropdownCategorias();
    renderCategoryTabs();
    if (shoppingListUL) {
        renderListForActiveCategory();
    }
});