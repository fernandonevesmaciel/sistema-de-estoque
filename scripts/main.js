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

    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            passwordToggle.textContent = type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    // --- Lógica da Página de Login ---
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

    // --- Lógica da Página de Dashboard ---
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        let products = [];
        let history = [];
        let users = [];
        let currentUserRole = '';

        // --- Lógica de busca automática por código ---
        const withdrawalCodeInput = document.getElementById('withdrawalProductCode');
        const displayProductName = document.getElementById('displayProductName');
        const withdrawalProductIdHidden = document.getElementById('withdrawalProductId');

        if (withdrawalCodeInput) {
            withdrawalCodeInput.addEventListener('input', (e) => {
                const typedCode = e.target.value.trim();
                // Procura no array local de produtos o item que tem o código digitado
                const found = products.find(p => p.codigo === typedCode);

                if (found) {
                    displayProductName.textContent = `✅ Produto: ${found.nome}`;
                    displayProductName.style.color = "green";
                    withdrawalProductIdHidden.value = found.id; // Salva o ID para o Firebase
                } else {
                    displayProductName.textContent = typedCode ? "❌ Código não encontrado" : "";
                    displayProductName.style.color = "red";
                    withdrawalProductIdHidden.value = ""; // Limpa o ID
                }
            });
        }

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

                const withdrawalTitle = document.querySelector('#withdrawalForm h3');
                if (withdrawalTitle) withdrawalTitle.style.display = 'block';
                const withdrawalForm = document.getElementById('withdrawalForm');
                if (withdrawalForm) withdrawalForm.style.display = 'block';

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
                populateProductDropdown(); // Adicionado para atualizar o dropdown de retirada
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

        // --- Adicionado: Nova lógica para o dropdown de retirada ---
        function populateProductDropdown() {
            const productSelect = document.getElementById('withdrawalProductName');
            if (!productSelect) return;

            productSelect.innerHTML = '';

            const availableProducts = products.filter(p => p.quantidade > 0);

            if (availableProducts.length === 0) {
                productSelect.innerHTML = `<option value="">Nenhum produto disponível</option>`;
                productSelect.disabled = true;
            } else {
                productSelect.disabled = false;
                productSelect.innerHTML = `<option value="">Selecione um produto</option>`;
                availableProducts.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.nome} (Estoque: ${product.quantidade})`;
                    productSelect.appendChild(option);
                });
            }

            // Adiciona um evento para mostrar a mensagem de estoque zerado
            productSelect.addEventListener('change', () => {
                const selectedProduct = products.find(p => p.id === productSelect.value);
                const quantityInput = document.getElementById('withdrawalQuantity');
                const message = document.getElementById('withdrawalMessage');

                if (selectedProduct && selectedProduct.quantidade === 0) {
                    message.textContent = '❌ Produto sem estoque.';
                    message.style.color = 'red';
                    quantityInput.disabled = true;
                } else {
                    message.textContent = '';
                    quantityInput.disabled = false;
                }
            });
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

            let lowStockItemsCount = 0;

            if (products.length === 0) {
                // Aumentamos o colspan para 5 colunas agora
                const colspanValue = currentUserRole === 'admin' ? 5 : 4;
                inventoryTableBody.innerHTML = `<tr><td colspan="${colspanValue}" class="no-products">Nenhum produto cadastrado.</td></tr>`;
                return;
            }

            products.forEach(product => {
                const row = document.createElement('tr');

                const minStock = product.minimo || 0;
                const isLowStock = product.quantidade <= minStock;

                if (isLowStock) lowStockItemsCount++;

                const qtyClass = isLowStock ? 'class="low-stock-alert"' : '';
                const alertIcon = isLowStock ? '⚠️' : '';

                // AJUSTE AQUI: Adicione a célula do código (product.codigo)
                // Verifique se no Firebase o nome do campo é 'codigo'. 
                // Se for 'productCode', mude para product.productCode
                let rowContent = `
                                    <td>${product.codigo || 'N/A'}</td> 
                                    <td>${product.nome}</td>
                                    <td ${qtyClass}>${product.quantidade} ${alertIcon}</td>
                                    <td>${minStock}</td> 
                                    <td>${product.localizacao}</td>
                                `;

                if (currentUserRole === 'admin') {
                    rowContent += `<td><div class="action-buttons"><button class="edit-button" onclick="editProduct('${product.id}')">Editar</button><button class="delete-button" onclick="deleteProduct('${product.id}')">Excluir</button></div></td>`;
                }

                row.innerHTML = rowContent;
                inventoryTableBody.appendChild(row);
            });
            // Atualiza o banner de alerta no topo
            const alertArea = document.getElementById('stockAlertArea');
            if (alertArea) {
                if (lowStockItemsCount > 0) {
                    alertArea.innerHTML = `
                <div class="alert-banner">
                    <span class="material-icons">warning</span>
                    Atenção: Existem ${lowStockItemsCount} produtos com estoque baixo ou no limite!
                </div>`;
                } else {
                    alertArea.innerHTML = '';
                }
            }

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

        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                const filterType = filterTypeSelect.value;
                let filterValue = '';
                if (filterType === 'day') filterValue = filterDayInput.value;
                else if (filterType === 'month') filterValue = filterMonthInput.value;
                else if (filterType === 'product') filterValue = filterProductSelect.value;
                fetchAndRenderHistory({ type: filterType, value: filterValue });
            });
        }

        if (clearFilterBtn) {
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
        }

        if (filterTypeSelect) {
            filterTypeSelect.addEventListener('change', (e) => {
                const filterType = e.target.value;
                filterDayInput.style.display = 'none';
                filterMonthInput.style.display = 'none';
                filterProductSelect.style.display = 'none';
                if (filterType === 'day') filterDayInput.style.display = 'block';
                else if (filterType === 'month') filterMonthInput.style.display = 'block';
                else if (filterType === 'product') filterProductSelect.style.display = 'block';
            });
        }

        window.editProduct = function (productId) {
            const productToEdit = products.find(p => p.id === productId);
            if (productToEdit) {
                document.getElementById('productId').value = productToEdit.id;
                document.getElementById('productName').value = productToEdit.nome;
                document.getElementById('productQuantity').value = productToEdit.quantidade;
                document.getElementById('productLocation').value = productToEdit.localizacao;
                // Preenche o valor mínimo na edição
                document.getElementById('productMin').value = productToEdit.minimo || 0;

                document.getElementById('addProductBtn').textContent = "Salvar Alterações";
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
                // Captura o novo campo
                const productMin = parseInt(document.getElementById('productMin').value) || 0;
                const productCode = document.getElementById('productCode').value;

                const productData = {
                    codigo: productCode,
                    nome: productName,
                    quantidade: productQuantity,
                    minimo: productMin, // Salva no Firebase
                    localizacao: productLocation
                };

                if (productId === '') {
                    db.collection('products').add(productData)
                        .then(() => {
                            formMessage.textContent = `Produto "${productName}" adicionado!`;
                            formMessage.style.color = 'green';
                            productForm.reset();
                        })
                        .catch(error => console.error("Erro:", error));
                } else {
                    db.collection('products').doc(productId).update(productData)
                        .then(() => {
                            formMessage.textContent = `Produto "${productName}" atualizado!`;
                            formMessage.style.color = 'green';
                            productForm.reset();
                            document.getElementById('productId').value = '';
                            document.getElementById('addProductBtn').textContent = "Adicionar Produto";
                        });
                }
            });
        }

        const withdrawalForm = document.getElementById('withdrawalForm');
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', (event) => {
                event.preventDefault();

                // Agora pegamos o ID do campo oculto preenchido pela busca
                const productId = document.getElementById('withdrawalProductId').value;
                const withdrawalQuantity = parseInt(document.getElementById('withdrawalQuantity').value);
                const withdrawalLocation = document.getElementById('withdrawalLocation').value;
                const withdrawalMessage = document.getElementById('withdrawalMessage');

                // Validação se o produto foi encontrado
                if (!productId) {
                    alert("Erro: Digite um código de produto válido.");
                    return;
                }

                const productToUpdate = products.find(p => p.id === productId);

                if (productToUpdate.quantidade >= withdrawalQuantity) {
                    const newQuantity = productToUpdate.quantidade - withdrawalQuantity;

                    db.collection('users').doc(auth.currentUser.uid).get().then(userDoc => {
                        let userName = userDoc.exists && userDoc.data().name ? userDoc.data().name : auth.currentUser.email;

                        db.collection('products').doc(productId).update({ quantidade: newQuantity }).then(() => {

                            // SALVANDO NO HISTÓRICO: Aqui unimos Nome + Código
                            const newHistoryItem = {
                                date: firebase.firestore.Timestamp.now(),
                                user: userName,
                                productName: `${productToUpdate.nome} (${productToUpdate.codigo})`, // Ex: Parafuso (PRD001)
                                quantity: withdrawalQuantity,
                                location: withdrawalLocation
                            };

                            db.collection('history').add(newHistoryItem).then(() => {
                                alert("Retirada registrada com sucesso!");
                                withdrawalForm.reset();
                                displayProductName.textContent = ""; // Limpa o nome exibido
                                withdrawalMessage.textContent = '';
                            }).catch(error => console.error("Erro ao adicionar histórico:", error));
                        });
                    });
                } else {
                    withdrawalMessage.textContent = "Erro: Quantidade insuficiente no estoque!";
                    withdrawalMessage.style.color = 'red';
                }
            });
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            const userPasswordToggle = document.getElementById('userPasswordToggle');
            const userPasswordInput = document.getElementById('userPassword');
            const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const passwordMatchMessage = document.getElementById('passwordMatchMessage');

            // --- Adicionado: Elementos para o novo campo de senha de administrador ---
            const adminPasswordToggle = document.getElementById('adminPasswordToggle');
            const adminPasswordInput = document.getElementById('adminPassword');

            if (userPasswordToggle && userPasswordInput) {
                userPasswordToggle.addEventListener('click', () => {
                    const type = userPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    userPasswordInput.setAttribute('type', type);
                    userPasswordToggle.textContent = type === 'password' ? 'visibility' : 'visibility_off';
                });
            }

            if (confirmPasswordToggle && confirmPasswordInput) {
                confirmPasswordToggle.addEventListener('click', () => {
                    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    confirmPasswordInput.setAttribute('type', type);
                    confirmPasswordToggle.textContent = type === 'password' ? 'visibility' : 'visibility_off';
                });
            }

            // --- Adicionado: Toggle para o campo de senha do administrador ---
            if (adminPasswordToggle && adminPasswordInput) {
                adminPasswordToggle.addEventListener('click', () => {
                    const type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    adminPasswordInput.setAttribute('type', type);
                    adminPasswordToggle.textContent = type === 'password' ? 'visibility' : 'visibility_off';
                });
            }

            if (userPasswordInput && confirmPasswordInput && passwordMatchMessage) {
                userPasswordInput.addEventListener('input', checkPasswords);
                confirmPasswordInput.addEventListener('input', checkPasswords);

                function checkPasswords() {
                    if (userPasswordInput.value === '' || confirmPasswordInput.value === '') {
                        passwordMatchMessage.textContent = '';
                        return;
                    }
                    if (userPasswordInput.value === confirmPasswordInput.value) {
                        passwordMatchMessage.textContent = 'As senhas coincidem!';
                        passwordMatchMessage.style.color = 'green';
                    } else {
                        passwordMatchMessage.textContent = 'As senhas não coincidem.';
                        passwordMatchMessage.style.color = 'red';
                    }
                }
            }

            userForm.addEventListener('submit', (event) => {
                event.preventDefault();

                if (userPasswordInput.value !== confirmPasswordInput.value) {
                    alert('As senhas não coincidem. Por favor, verifique.');
                    return;
                }

                const userName = userForm['userName'].value;
                const userEmail = userForm['userEmail'].value;
                const userPassword = userForm['userPassword'].value;
                const userRole = userForm['userRole'].value;

                // --- Substituído: Lógica do prompt por getElementById ---
                const adminPassword = document.getElementById('adminPassword').value;

                // Salva a referência do usuário administrador atual
                const adminUser = auth.currentUser;

                auth.createUserWithEmailAndPassword(userEmail, userPassword)
                    .then((userCredential) => {
                        const newUser = userCredential.user;
                        console.log("Novo usuário criado no Auth:", newUser.uid);

                        db.collection('users').doc(newUser.uid).set({ name: userName, email: userEmail, role: userRole })
                            .then(() => {
                                console.log("Dados do novo usuário adicionados ao Firestore.");

                                auth.signInWithEmailAndPassword(adminUser.email, adminPassword)
                                    .then(() => {
                                        console.log("Administrador reautenticado com sucesso. Sessão mantida.");
                                        alert(`Usuário ${userName} adicionado com sucesso! Nível de acesso: ${userRole}`);
                                        userForm.reset();
                                        passwordMatchMessage.textContent = '';
                                        // Limpa o campo de senha do administrador após a operação
                                        document.getElementById('adminPassword').value = '';
                                    })
                                    .catch(error => {
                                        console.error("Erro ao reautenticar o administrador:", error);
                                        alert("Erro de autenticação. Por favor, faça login novamente.");
                                        auth.signOut(); // Desloga por segurança
                                    });

                            })
                            .catch(error => {
                                console.error("Erro ao adicionar usuário no Firestore:", error);
                                alert("Erro ao adicionar usuário no Firestore. Verifique o console.");
                                newUser.delete().catch(err => console.error("Erro ao remover usuário do Auth:", err));
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