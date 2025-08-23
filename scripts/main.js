// --- Inicialização do Firebase (NO TOPO DO ARQUIVO) ---
const firebaseConfig = {
    apiKey: "AIzaSyCUvbA1o5k-2QmXNZ8GcCWSzpLyMe7EYvg",
    authDomain: "controle-de-estoque-app-8382c.firebaseapp.com",
    projectId: "controle-de-estoque-app-8382c",
    storageBucket: "controle-de-estoque-app-8382c.firebasestorage.app",
    messagingSenderId: "110865869405",
    appId: "1:110865869405:web:4d4ef71dbf06ddb834bbb4",
    measurementId: "G-3N3YYRJ21F"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Lógica da página de Login e Dashboard ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginForm['email'].value;
            const password = loginForm['password'].value;
            const loginMessage = document.getElementById('loginMessage');

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    console.log("Login bem-sucedido!");
                    loginMessage.textContent = 'Login bem-sucedido! Redirecionando...';
                    loginMessage.style.color = 'green';
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    console.error("Erro de login:", error);
                    loginMessage.textContent = 'Erro ao fazer login. Verifique seu e-mail e senha.';
                    loginMessage.style.color = 'red';
                });
        });
    }

    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        let products = [];
        let history = [];
        let users = [];
        let currentUserRole = '';

        const inventoryTableBody = document.getElementById('inventoryTableBody');
        const historyTableBody = document.getElementById('historyTableBody');
        const formMessage = document.getElementById('formMessagem');

        // Novos elementos de filtro
        const filterTypeSelect = document.getElementById('filterType');
        const filterDayInput = document.getElementById('filterDay');
        const filterMonthInput = document.getElementById('filterMonth');
        const filterProductSelect = document.getElementById('filterProduct');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');

        // --- FUNÇÃO: setupUI() ---
        function setupUI(role) {
            // Esconde todas as abas e desativa todos os botões no início
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

            const withdrawalTabButton = document.querySelector('button[onclick="showTab(\'withdrawals\')"]');
            const productTabButton = document.querySelector('button[onclick="showTab(\'products\')"]');
            const userTabButton = document.querySelector('button[onclick="showTab(\'users\')"]');
            const historyTabButton = document.querySelector('button[onclick="showTab(\'history\')"]');
            const productForm = document.querySelector('#productForm');
            const colum_action = document.querySelector('#colum_action');


            if (role === 'common') {
                if (withdrawalTabButton) withdrawalTabButton.style.display = 'none';
                if (productTabButton) productTabButton.style.display = 'none';
                if (historyTabButton) historyTabButton.style.display = 'none';
                if (userTabButton) userTabButton.style.display = 'none';
                if (productForm) productForm.style.display = 'none';
                if (colum_action) colum_action.style.display = 'none';


                // EXIBE A ABA DE RETIRADAS POR PADRÃO PARA O USUÁRIO COMUM
                const withdrawalsTab = document.getElementById('withdrawals');
                if (withdrawalsTab) {
                    withdrawalsTab.style.display = 'block';
                }
            } else { // role === 'admin'
                if (withdrawalTabButton) withdrawalTabButton.style.display = 'block';
                if (productTabButton) productTabButton.style.display = 'block';
                if (historyTabButton) historyTabButton.style.display = 'block';
                if (userTabButton) userTabButton.style.display = 'block';
                if (productForm) productForm.style.display = 'block';
                if (colum_action) colum_action.style.display = 'table-cell';

                // Exibe o título e o formulário para o admin
                if (withdrawalTitle) withdrawalTitle.style.display = 'block';
                const withdrawalForm = document.getElementById('withdrawalForm');
                if (withdrawalForm) withdrawalForm.style.display = 'block';

                // EXIBE A ABA DE PRODUTOS POR PADRÃO PARA O ADMIN
                const productsTab = document.getElementById('products');
                if (productsTab) {
                    productsTab.style.display = 'block';
                    if (productTabButton) productTabButton.classList.add('active');
                }
            }
        }

        async function migrateHistoryDates() {
            console.log("Iniciando a migração do histórico...");
            const historyRef = db.collection('history');
            const snapshot = await historyRef.get();
            const batch = db.batch();
            let migratedCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && typeof data.date === 'string') {
                    const parts = data.date.split(', ');
                    if (parts.length === 2) {
                        const dateParts = parts[0].split('/');
                        const timeParts = parts[1].split(':');
                        const day = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10) - 1;
                        const year = parseInt(dateParts[2], 10);
                        const hour = parseInt(timeParts[0], 10);
                        const minute = parseInt(timeParts[1], 10);
                        const second = parseInt(timeParts[2], 10);
                        const newDate = new Date(year, month, day, hour, minute, second);

                        if (!isNaN(newDate.getTime())) {
                            const newTimestamp = firebase.firestore.Timestamp.fromDate(newDate);
                            batch.update(doc.ref, { date: newTimestamp });
                            migratedCount++;
                        } else {
                            console.warn("Não foi possível migrar a data do documento:", doc.id, " - Formato inválido:", data.date);
                        }
                    } else {
                        console.warn("Não foi possível migrar a data do documento:", doc.id, " - Formato inesperado:", data.date);
                    }
                }
            });

            if (migratedCount > 0) {
                await batch.commit();
                console.log(`✅ ${migratedCount} documentos do histórico migrados com sucesso.`);
            } else {
                console.log("Nenhum documento do histórico precisou ser migrado. O formato já está correto.");
            }
        }

        function setupRealtimeListeners() {
            db.collection('products').onSnapshot(snapshot => {
                console.log("Produtos atualizados em tempo real!");
                products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts();
                populateProductFilterDropdown();
            }, error => {
                console.error("Erro ao carregar produtos:", error);
            });

            db.collection('history').orderBy('date', 'desc').onSnapshot(snapshot => {
                console.log("Histórico atualizado em tempo real!");
                history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderHistory();
            }, error => {
                console.error("Erro ao carregar histórico:", error);
            });

            db.collection('users').onSnapshot(snapshot => {
                console.log("Usuários atualizados em tempo real!");
                users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }, error => {
                console.error("Erro ao carregar usuários:", error);
            });
        }

        function populateProductDropdown() {
            const productSelect = document.getElementById('withdrawalProductName');
            if (!productSelect) return;
            productSelect.innerHTML = '';
            if (products.length === 0) {
                productSelect.innerHTML = `<option value="">Nenhum produto disponível</option>`;
                productSelect.disabled = true;
            } else {
                productSelect.disabled = false;
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.nome} (Estoque: ${product.quantidade})`;
                    productSelect.appendChild(option);
                });
            }
        }

        function populateProductFilterDropdown() {
            if (!filterProductSelect) return;
            filterProductSelect.innerHTML = `<option value="">Todos os Produtos</option>`;
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.nome;
                option.textContent = product.nome;
                filterProductSelect.appendChild(option);
            });
        }

        function renderProducts() {
            if (!inventoryTableBody) return;
            inventoryTableBody.innerHTML = '';
            products.sort((a, b) => a.nome.localeCompare(b.nome));

            const actionsHeader = document.getElementById('actionsHeader');
            if (actionsHeader) {
                actionsHeader.style.display = currentUserRole === 'common' ? 'none' : 'table-cell';
            }

            if (products.length === 0) {
                const colspanValue = currentUserRole === 'admin' ? 4 : 3;
                inventoryTableBody.innerHTML = `<tr><td colspan="${colspanValue}" class="no-products">Nenhum produto cadastrado.</td></tr>`;
                return;
            }

            products.forEach(product => {
                const row = document.createElement('tr');
                let rowContent = `<td>${product.nome}</td><td>${product.quantidade}</td><td>${product.localizacao}</td>`;

                if (currentUserRole === 'admin') {
                    rowContent += `<td><div class="action-buttons"><button class="edit-button" onclick="editProduct('${product.id}')">Editar</button><button class="delete-button" onclick="deleteProduct('${product.id}')">Excluir</button></div></td>`;
                }

                row.innerHTML = rowContent;
                inventoryTableBody.appendChild(row);
            });
            populateProductDropdown();
        }

        function renderHistory(filteredHistory) {
            if (!historyTableBody) return;
            historyTableBody.innerHTML = '';
            const dataToRender = filteredHistory || history;
            if (dataToRender.length === 0) {
                historyTableBody.innerHTML = `<tr><td colspan="5" class="no-products">Nenhuma movimentação registrada.</td></tr>`;
                return;
            }
            dataToRender.forEach(item => {
                const row = document.createElement('tr');
                const formattedDate = (item.date && typeof item.date.toDate === 'function') ? item.date.toDate().toLocaleString() : 'Erro de Data';
                row.innerHTML = `<td>${formattedDate}</td><td>${item.user}</td><td>${item.productName}</td><td>${item.quantity}</td><td>${item.location}</td>`;
                historyTableBody.appendChild(row);
            });
        }

        async function fetchAndRenderHistory(appliedFilters = {}) {
            let historyQuery = db.collection('history').orderBy('date', 'desc');
            try {
                const snapshot = await historyQuery.get();
                let filteredHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (appliedFilters.type === 'day' && appliedFilters.value) {
                    const selectedDate = new Date(appliedFilters.value + 'T00:00:00');
                    const nextDay = new Date(selectedDate);
                    nextDay.setDate(selectedDate.getDate() + 1);
                    filteredHistory = filteredHistory.filter(item => {
                        const itemDate = item.date.toDate();
                        return itemDate >= selectedDate && itemDate < nextDay;
                    });
                } else if (appliedFilters.type === 'month' && appliedFilters.value) {
                    const [year, month] = appliedFilters.value.split('-').map(Number);
                    filteredHistory = filteredHistory.filter(item => {
                        const itemDate = item.date.toDate();
                        return itemDate.getFullYear() === year && (itemDate.getMonth() + 1) === month;
                    });
                } else if (appliedFilters.type === 'product' && appliedFilters.value) {
                    const filterValueLower = appliedFilters.value.toLowerCase();
                    filteredHistory = filteredHistory.filter(item => item.productName && item.productName.toLowerCase() === filterValueLower);
                }
                renderHistory(filteredHistory);
            } catch (error) {
                console.error("Erro ao buscar histórico filtrado:", error);
            }
        }

        applyFilterBtn.addEventListener('click', () => {
            const filterType = filterTypeSelect.value;
            let filterValue = '';
            if (filterType === 'day') filterValue = filterDayInput.value;
            else if (filterType === 'month') filterValue = filterMonthInput.value;
            else if (filterType === 'product') filterValue = filterProductSelect.value;
            fetchAndRenderHistory({ type: filterType, value: filterValue });
        });

        clearFilterBtn.addEventListener('click', () => {
            filterTypeSelect.value = 'all';
            filterDayInput.style.display = 'none';
            filterMonthInput.style.display = 'none';
            filterProductSelect.style.display = 'none';
            filterDayInput.value = '';
            filterMonthInput.value = '';
            filterProductSelect.value = '';
            fetchAndRenderHistory();
        });

        filterTypeSelect.addEventListener('change', (e) => {
            const filterType = e.target.value;
            filterDayInput.style.display = 'none';
            filterMonthInput.style.display = 'none';
            filterProductSelect.style.display = 'none';
            if (filterType === 'day') filterDayInput.style.display = 'block';
            else if (filterType === 'month') filterMonthInput.style.display = 'block';
            else if (filterType === 'product') filterProductSelect.style.display = 'block';
        });

        // --- FUNÇÃO CORRIGIDA E MELHORADA ---
        window.editProduct = function (productId) {
            const productToEdit = products.find(p => p.id === productId);
            if (productToEdit) {
                document.getElementById('productId').value = productToEdit.id;
                document.getElementById('productName').value = productToEdit.nome;
                document.getElementById('productQuantity').value = productToEdit.quantidade;
                document.getElementById('productLocation').value = productToEdit.localizacao;

                document.getElementById('addProductBtn').textContent = "Salvar Alterações";

                if (formMessage) { // Adiciona verificação para evitar o erro de 'null'
                    formMessage.textContent = '✏️ Você está editando este item. Altere os campos e clique em "Salvar Alterações".';
                    formMessage.style.color = 'blue';
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        window.deleteProduct = function (productId) {
            if (confirm("Tem certeza que deseja excluir este produto?")) {
                db.collection('products').doc(productId).delete()
                    .then(() => {
                        console.log("Documento excluído com sucesso!");
                    })
                    .catch(error => {
                        console.error("Erro ao remover documento:", error);
                    });
            }
        };

        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const productId = document.getElementById('productId').value;
                const productName = document.getElementById('productName').value;
                const productQuantity = parseInt(document.getElementById('productQuantity').value);
                const productLocation = document.getElementById('productLocation').value;
                const productData = { nome: productName, quantidade: productQuantity, localizacao: productLocation };

                if (productId === '') {
                    db.collection('products').add(productData)
                        .then(() => {
                            console.log("Produto adicionado com sucesso!");
                            if (formMessage) {
                                formMessage.textContent = `Produto "${productName}" adicionado com sucesso!`;
                                formMessage.style.color = 'green';
                            }
                            productForm.reset();
                            document.getElementById('addProductBtn').textContent = "Adicionar Produto";
                        })
                        .catch(error => {
                            console.error("Erro ao adicionar produto:", error);
                            if (formMessage) {
                                formMessage.textContent = 'Erro ao adicionar produto. Tente novamente.';
                                formMessage.style.color = 'red';
                            }
                        });
                } else {
                    db.collection('products').doc(productId).update(productData)
                        .then(() => {
                            console.log("Produto atualizado com sucesso!");
                            if (formMessage) {
                                formMessage.textContent = `Produto "${productName}" atualizado com sucesso!`;
                                formMessage.style.color = 'green';
                            }
                            productForm.reset();
                            document.getElementById('addProductBtn').textContent = "Adicionar Produto";
                            document.getElementById('productId').value = '';
                        })
                        .catch(error => {
                            console.error("Erro ao atualizar produto:", error);
                            if (formMessage) {
                                formMessage.textContent = 'Erro ao atualizar produto. Tente novamente.';
                            }
                        });
                }
            });
        }

        const withdrawalForm = document.getElementById('withdrawalForm');
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const productId = document.getElementById('withdrawalProductName').value;
                const withdrawalQuantity = parseInt(document.getElementById('withdrawalQuantity').value);
                const withdrawalLocation = document.getElementById('withdrawalLocation').value;
                const productToUpdate = products.find(p => p.id === productId);

                if (productToUpdate && productToUpdate.quantidade >= withdrawalQuantity) {
                    const newQuantity = productToUpdate.quantidade - withdrawalQuantity;
                    db.collection('users').doc(auth.currentUser.uid).get()
                        .then(userDoc => {
                            let userName = userDoc.exists && userDoc.data().name ? userDoc.data().name : auth.currentUser.email;
                            db.collection('products').doc(productId).update({ quantidade: newQuantity })
                                .then(() => {
                                    console.log("Estoque atualizado com sucesso!");
                                    const newHistoryItem = { date: firebase.firestore.Timestamp.now(), user: userName, productName: productToUpdate.nome, quantity: withdrawalQuantity, location: withdrawalLocation };
                                    db.collection('history').add(newHistoryItem)
                                        .then(() => alert("Retirada registrada com sucesso!"))
                                        .catch(error => console.error("Erro ao adicionar histórico:", error));
                                })
                                .catch(error => console.error("Erro ao atualizar estoque:", error));
                        })
                        .catch(error => {
                            console.error("Erro ao buscar informações do usuário:", error);
                            alert("Erro ao registrar a retirada. Verifique o console para mais detalhes.");
                        });
                } else {
                    alert("Erro: Quantidade insuficiente no estoque!");
                }
                withdrawalForm.reset();
            });
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const userName = userForm['userName'].value;
                const userEmail = userForm['userEmail'].value;
                const userPassword = userForm['userPassword'].value;
                const userRole = userForm['userRole'].value;
                auth.createUserWithEmailAndPassword(userEmail, userPassword)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        console.log("Usuário criado no Auth:", user.uid);
                        db.collection('users').doc(user.uid).set({ name: userName, email: userEmail, role: userRole })
                            .then(() => {
                                alert(`Usuário ${userName} adicionado com sucesso! Nível de acesso: ${userRole}`);
                                userForm.reset();
                            })
                            .catch(error => {
                                console.error("Erro ao adicionar usuário no Firestore:", error);
                                alert("Erro ao adicionar usuário no Firestore. Verifique o console.");
                            });
                    })
                    .catch((error) => {
                        console.error("Erro ao criar usuário no Auth:", error);
                        alert(`Erro ao criar usuário: ${error.message}`);
                    });
            });
        }

        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get()
                    .then(doc => {
                        currentUserRole = doc.exists ? doc.data().role : 'common';
                        setupUI(currentUserRole);
                        setupRealtimeListeners();
                    })
                    .catch(error => {
                        console.error("Erro ao buscar nível de acesso:", error);
                        auth.signOut();
                    });
            } else {
                window.location.href = 'index.html';
            }
        });

        // --- FUNÇÃO showTab COM A ROLAGEM ADICIONADA ---
        window.showTab = function (tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

            const clickedTabContent = document.getElementById(tabId);
            const clickedTabButton = document.querySelector(`button[onclick="showTab('${tabId}')"]`);

            if (clickedTabContent) {
                clickedTabContent.style.display = 'block';
                if (clickedTabButton) {
                    clickedTabButton.classList.add('active');
                }

                // Adiciona o scroll automático para o início do conteúdo da aba
                clickedTabContent.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        };

        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                auth.signOut().then(() => window.location.href = 'index.html').catch(error => console.error("Erro ao fazer logout:", error));
            });
        }
    }
});