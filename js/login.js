// Manipulador da página de login
document.addEventListener('DOMContentLoaded', () => {
    console.info("Inicializando página...");
    
    // Verificar se estamos na página de login
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        console.debug("Página de login detectada");
        
        // Verificar se o usuário já está autenticado
        if (authService.isAuthenticated()) {
            console.info("Usuário já autenticado, redirecionando...");
            authService.redirectBasedOnRole();
            return;
        }
        
        const loginForm = document.getElementById('login-form');
        
        // Se o formulário existir, configurar handler
        if (loginForm) {
            console.debug("Formulário de login encontrado, configurando handlers");
            
            // Verificar se há um parâmetro de sessão expirada
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('expired') === 'true') {
                showMessage('Sua sessão expirou. Por favor, faça login novamente.', 'error');
            }
            
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Mostrar indicador de carregamento
                showLoading(true);
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('remember-me')?.checked || false;
                
                console.info(`Tentativa de login para ${email} (lembrar: ${rememberMe})`);
                
                try {
                    const result = await authService.login(email, password, rememberMe);
                    
                    // Esconder indicador de carregamento
                    showLoading(false);
                    
                    if (result.success) {
                        console.info("Login bem-sucedido!");
                        // Limpar senha do formulário por segurança
                        document.getElementById('password').value = '';
                        
                        // Mostrar mensagem de sucesso breve
                        showMessage('Login bem-sucedido! Redirecionando...', 'success');
                        
                        // Aguardar um momento para mostrar mensagem de sucesso
                        setTimeout(() => {
                            // Redirecionar baseado no papel do usuário
                            authService.redirectBasedOnRole();
                        }, 1000);
                    } else {
                        console.warn("Falha no login:", result.message);
                        // Exibir mensagem de erro
                        showMessage(result.message, 'error');
                    }
                } catch (error) {
                    console.error("Erro ao processar login:", error);
                    showLoading(false);
                    showMessage('Erro ao processar login. Tente novamente.', 'error');
                }
            });
            
            // Adicionar event listener para tecla Enter no campo de senha
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        loginForm.dispatchEvent(new Event('submit'));
                    }
                });
            }
        } else {
            console.warn("Formulário de login não encontrado!");
        }
    } else {
        console.debug("Página protegida detectada");
        
        // Verificar autenticação nas outras páginas
        if (!authService.checkAuthAndRedirect()) {
            console.warn("Verificação de autenticação falhou");
            return;
        }
        
        // Configurar informações do usuário na UI
        authService.setUserInfoUI();
        
        // Configurar botão de logout se existir
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            console.debug("Botão de logout encontrado, configurando handler");
            logoutBtn.addEventListener('click', () => {
                console.info("Logout iniciado pelo usuário");
                authService.logout();
            });
        }
        
        console.info("Página carregada com sucesso");
    }
});

// Funções de UI auxiliares
function showLoading(show = true) {
    const loadingEl = document.getElementById('loading-overlay');
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
        console.debug(`Indicador de carregamento: ${show ? 'visível' : 'oculto'}`);
    } else {
        console.warn("Elemento de loading não encontrado");
    }
}

function showMessage(message, type = 'success') {
    console.debug(`Exibindo mensagem (${type}): ${message}`);
    
    // Verificar se existe container de toast
    let toastContainer = document.getElementById('toast-container');
    
    // Se não existir, criar um
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(toastContainer);
    }
    
    // Criar elemento toast
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-100 text-green-800' :
        type === 'error' ? 'bg-red-100 text-red-800' : 
        'bg-blue-100 text-blue-800'
    }`;
    
    toast.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <span class="font-medium">${message}</span>
            </div>
            <button class="ml-4 text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Adicionar ao container
    toastContainer.appendChild(toast);
    
    // Configurar botão de fechar
    toast.querySelector('button').addEventListener('click', () => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    });
    
    // Auto-fechar após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}