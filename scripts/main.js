// --- Inicialização do Firebase (NO TOPO DO ARQUIVO) ---
// Substitua este objeto pelo que você copiou do Firebase
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
        const formMessage = document.getElementById('formMessage');

        function setupUI(role) {
            const productForm = document.getElementById('productForm');
            const userTabButton = document.querySelector('button[onclick="showTab(\'users\')"]');
            const historyContainer = document.getElementById('historyTableContainer');

            if (role === 'common') {
                if (productForm) productForm.style.display = 'none';
                if (userTabButton) userTabButton.style.display = 'none';
                if (historyContainer) historyContainer.style.display = 'none';
            } else { // Este é o bloco que estava faltando ou incompleto
                if (productForm) productForm.style.display = 'block';
                if (userTabButton) userTabButton.style.display = 'block';
                if (historyContainer) historyContainer.style.display = 'block'; // Adicione esta linha
            }
        }

        function fetchDataAndRender() {
            db.collection('products').get().then(snapshot => {
                products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts();
            }).catch(error => {
                console.error("Erro ao carregar produtos:", error);
            });

            db.collection('history').get().then(snapshot => {
                history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderHistory();
            }).catch(error => {
                console.error("Erro ao carregar histórico:", error);
            });
            
            db.collection('users').get().then(snapshot => {
                users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Aqui você pode adicionar uma função para renderizar a tabela de usuários, se desejar
            }).catch(error => {
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

        function renderProducts() {
            if (!inventoryTableBody) return;
            inventoryTableBody.innerHTML = '';
            if (products.length === 0) {
                inventoryTableBody.innerHTML = `<tr><td colspan="4" class="no-products">Nenhum produto cadastrado.</td></tr>`;
                return;
            }
            products.forEach(product => {
                const row = document.createElement('tr');
                const actionButtonsHTML = currentUserRole === 'admin' ? `<td><div class="action-buttons"><button class="edit-button" onclick="editProduct('${product.id}')">Editar</button><button class="delete-button" onclick="deleteProduct('${product.id}')">Excluir</button></div></td>` : `<td></td>`;
                row.innerHTML = `<td>${product.nome}</td><td>${product.quantidade}</td><td>${product.localizacao}</td>${actionButtonsHTML}`;
                inventoryTableBody.appendChild(row);
            });
            populateProductDropdown();
        }

        function renderHistory() {
            if (!historyTableBody) return;
            historyTableBody.innerHTML = '';
            if (history.length === 0) {
                historyTableBody.innerHTML = `<tr><td colspan="5" class="no-products">Nenhuma movimentação registrada.</td></tr>`;
                return;
            }
            history.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${item.date}</td><td>${item.user}</td><td>${item.productName}</td><td>${item.quantity}</td><td>${item.location}</td>`;
                historyTableBody.appendChild(row);
            });
        }

        window.editProduct = function(productId) {
            const productToEdit = products.find(p => p.id === productId);
            if (productToEdit) {
                document.getElementById('productId').value = productToEdit.id;
                document.getElementById('productName').value = productToEdit.nome;
                document.getElementById('productQuantity').value = productToEdit.quantidade;
                document.getElementById('productLocation').value = productToEdit.localizacao;
                document.getElementById('submitButton').textContent = "Salvar Alterações";
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        window.deleteProduct = function(productId) {
            if (confirm("Tem certeza que deseja excluir este produto?")) {
                db.collection('products').doc(productId).delete()
                    .then(() => {
                        console.log("Documento excluído com sucesso!");
                        fetchDataAndRender();
                    })
                    .catch(error => {
                        console.error("Erro ao remover documento:", error);
                    });
            }
        }

        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (event) => {
                event.preventDefault();
                formMessage.textContent = '';
                formMessage.style.color = 'green';
                const productId = document.getElementById('productId').value;
                const productName = document.getElementById('productName').value;
                const productQuantity = parseInt(document.getElementById('productQuantity').value);
                const productLocation = document.getElementById('productLocation').value;
                const productData = {
                    nome: productName,
                    quantidade: productQuantity,
                    localizacao: productLocation
                };
                if (productId === '') {
                    db.collection('products').add(productData)
                        .then(() => {
                            console.log("Produto adicionado com sucesso!");
                            formMessage.textContent = `Produto "${productName}" adicionado com sucesso!`;
                            fetchDataAndRender();
                        })
                        .catch(error => {
                            console.error("Erro ao adicionar produto:", error);
                        });
                } else {
                    db.collection('products').doc(productId).update(productData)
                        .then(() => {
                            console.log("Produto atualizado com sucesso!");
                            formMessage.textContent = `Produto "${productName}" atualizado com sucesso!`;
                            fetchDataAndRender();
                        })
                        .catch(error => {
                            console.error("Erro ao atualizar produto:", error);
                        });
                }
                productForm.reset();
                document.getElementById('submitButton').textContent = "Adicionar Produto";
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

                    // Busca o nome do usuário no Firestore antes de registrar a retirada
                    db.collection('users').doc(auth.currentUser.uid).get()
                    .then(userDoc => {
                        let userName = auth.currentUser.email; // Valor padrão: e-mail
                        if (userDoc.exists && userDoc.data().name) { // Verifique se o doc existe E se o campo 'name' existe
                            userName = userDoc.data().name;
                        }
                            // Atualiza o estoque
                            db.collection('products').doc(productId).update({
                                quantidade: newQuantity
                            }).then(() => {
                                console.log("Estoque atualizado com sucesso!");

                                // Registra o item no histórico usando o nome do usuário
                                const newHistoryItem = {
                                    date: new Date().toLocaleString(),
                                    user: userName,
                                    productName: productToUpdate.nome,
                                    quantity: withdrawalQuantity,
                                    location: withdrawalLocation
                                };

                                db.collection('history').add(newHistoryItem)
                                    .then(() => {
                                        alert("Retirada registrada com sucesso!");
                                        fetchDataAndRender();
                                    })
                                    .catch(error => {
                                        console.error("Erro ao adicionar histórico:", error);
                                    });
                            }).catch(error => {
                                console.error("Erro ao atualizar estoque:", error);
                            });
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

                        db.collection('users').doc(user.uid).set({
                            name: userName,
                            email: userEmail,
                            role: userRole
                        })
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
                console.log("Usuário logado:", user.email);
                console.log("UID do usuário logado:", user.uid);

                db.collection('users').doc(user.uid).get()
                    .then(doc => {
                        if (doc.exists) {
                            // Este bloco é executado quando o documento é encontrado
                            currentUserRole = doc.data().role;
                            console.log("Nível de acesso do usuário:", currentUserRole);
                            setupUI(currentUserRole);
                            fetchDataAndRender();
                        } else {
                            // Este bloco é executado quando o documento NÃO é encontrado
                            const user = auth.currentUser;
                            alert(`Erro! Documento do usuário não encontrado. UID do usuário logado: ${user.uid}`);
                            console.error("Documento do usuário não encontrado no Firestore!");
                            auth.signOut();
                        }
                    })
                    .catch(error => {
                        console.error("Erro ao buscar nível de acesso:", error);
                        auth.signOut();
                    });
            } else {
                console.log("Nenhum usuário logado. Redirecionando...");
                window.location.href = 'index.html';
            }
        });

        window.showTab = function(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
            document.getElementById(tabId).style.display = 'block';
            event.currentTarget.classList.add('active');
        };

        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                });
            });
        }
    }
});