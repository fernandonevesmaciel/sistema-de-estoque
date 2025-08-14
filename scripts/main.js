// --- Lógica da página de Login e Dashboard ---
document.addEventListener('DOMContentLoaded', () => {
    // Apenas para a página de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const email = loginForm['email'].value;
            const password = loginForm['password'].value;
            const loginMessage = document.getElementById('loginMessage');
            
            firebase.auth().signInWithEmailAndPassword(email, password)
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

    // Lógica para o dashboard (se a página for dashboard.html)
    const dashboardContainer = document.getElementById('dashboard-container');
    if (dashboardContainer) {
        let products = [];
        let history = [];

        const inventoryTableBody = document.getElementById('inventoryTableBody');
        const historyTableBody = document.getElementById('historyTableBody');
        const formMessage = document.getElementById('formMessage');

        // FUNÇÃO QUE VAI LER OS DADOS DO FIRESTORE E RENDERIZAR AS TABELAS
        function fetchDataAndRender() {
            // Ler a coleção 'products'
            db.collection('products').get().then(snapshot => {
                products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts();
            });

            // Ler a coleção 'history'
            db.collection('history').get().then(snapshot => {
                history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderHistory();
            });
        }
        
        // Função para preencher a lista de produtos na aba de retirada
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

        // Função para renderizar (desenhar) a tabela de produtos
        function renderProducts() {
            if (!inventoryTableBody) return;

            inventoryTableBody.innerHTML = '';
            if (products.length === 0) {
                inventoryTableBody.innerHTML = `<tr><td colspan="4" class="no-products">Nenhum produto cadastrado.</td></tr>`;
                return;
            }

            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.nome}</td>
                    <td>${product.quantidade}</td>
                    <td>${product.localizacao}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit-button" onclick="editProduct('${product.id}')">Editar</button>
                            <button class="delete-button" onclick="deleteProduct('${product.id}')">Excluir</button>
                        </div>
                    </td>
                `;
                inventoryTableBody.appendChild(row);
            });
            
            populateProductDropdown();
        }

        // Função para renderizar (desenhar) a tabela de histórico
        function renderHistory() {
            if (!historyTableBody) return;

            historyTableBody.innerHTML = '';
            if (history.length === 0) {
                historyTableBody.innerHTML = `<tr><td colspan="5" class="no-products">Nenhuma movimentação registrada.</td></tr>`;
                return;
            }

            history.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.date}</td>
                    <td>${item.user}</td>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>${item.location}</td>
                `;
                historyTableBody.appendChild(row);
            });
        }
        
        // Funções de ação de produtos (edição e exclusão)
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
                        fetchDataAndRender(); // Atualiza as tabelas após a exclusão
                    })
                    .catch(error => {
                        console.error("Erro ao remover documento:", error);
                    });
            }
        }

        // Lógica do formulário de produtos
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
                            fetchDataAndRender(); // Atualiza as tabelas
                        })
                        .catch(error => {
                            console.error("Erro ao adicionar produto:", error);
                        });
                } else {
                    db.collection('products').doc(productId).update(productData)
                        .then(() => {
                            console.log("Produto atualizado com sucesso!");
                            formMessage.textContent = `Produto "${productName}" atualizado com sucesso!`;
                            fetchDataAndRender(); // Atualiza as tabelas
                        })
                        .catch(error => {
                            console.error("Erro ao atualizar produto:", error);
                        });
                }
                
                productForm.reset();
                document.getElementById('submitButton').textContent = "Adicionar Produto";
            });
        }

        // Lógica do formulário de retirada
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
                    
                    // Atualiza o documento no Firestore
                    db.collection('products').doc(productId).update({
                        quantidade: newQuantity
                    }).then(() => {
                        console.log("Estoque atualizado com sucesso!");

                        // Adiciona a movimentação ao histórico
                        const newHistoryItem = {
                            date: new Date().toLocaleString(),
                            user: firebase.auth().currentUser.email,
                            productName: productToUpdate.nome,
                            quantity: withdrawalQuantity,
                            location: withdrawalLocation
                        };
                        db.collection('history').add(newHistoryItem)
                            .then(() => {
                                alert("Retirada registrada com sucesso!");
                                fetchDataAndRender(); // Atualiza as tabelas
                            })
                            .catch(error => {
                                console.error("Erro ao adicionar histórico:", error);
                            });
                    }).catch(error => {
                        console.error("Erro ao atualizar estoque:", error);
                    });

                } else {
                    alert("Erro: Quantidade insuficiente no estoque!");
                }
                withdrawalForm.reset();
            });
        }

        // Lógica do formulário de usuários (a ser implementada com o Firestore no futuro)
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (event) => {
                event.preventDefault();
                console.log("Formulário de usuário submetido!");
                userForm.reset();
            });
        }
        
        // Chamada inicial para carregar os dados do Firestore
        fetchDataAndRender();

        // A função showTab precisa ser global para o onclick
        window.showTab = function(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
            document.getElementById(tabId).style.display = 'block';
            event.currentTarget.classList.add('active');
        };

        // Lógica de logout
        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                firebase.auth().signOut().then(() => {
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error("Erro ao fazer logout:", error);
                });
            });
        }
    }
});