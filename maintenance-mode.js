// Gestion du mode maintenance

const maintenanceManager = {
    // Vérifier si le mode maintenance est activé
    async isMaintenanceMode() {
        try {
            if (!window.supabaseClient) {
                console.warn('Supabase non disponible pour vérifier le mode maintenance');
                return false;
            }

            const { data, error } = await window.supabaseClient
                .from('site_settings')
                .select('setting_value')
                .eq('setting_key', 'maintenance_mode')
                .single();

            if (error) {
                console.error('Erreur lors de la vérification du mode maintenance:', error);
                return false;
            }

            return data?.setting_value?.enabled || false;
        } catch (err) {
            console.error('Erreur maintenance check:', err);
            return false;
        }
    },

    // Récupérer les paramètres du mode maintenance
    async getMaintenanceSettings() {
        try {
            if (!window.supabaseClient) {
                return { enabled: false, message: 'Le site est en maintenance.' };
            }

            const { data, error } = await window.supabaseClient
                .from('site_settings')
                .select('setting_value')
                .eq('setting_key', 'maintenance_mode')
                .single();

            if (error) {
                console.error('Erreur lors de la récupération des paramètres:', error);
                return { enabled: false, message: 'Le site est en maintenance.' };
            }

            return data?.setting_value || { enabled: false, message: 'Le site est en maintenance.' };
        } catch (err) {
            console.error('Erreur get settings:', err);
            return { enabled: false, message: 'Le site est en maintenance.' };
        }
    },

    // Activer le mode maintenance
    async enable(message = 'Le site est actuellement en maintenance. Nous serons de retour bientôt!') {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase non disponible');
            }

            const { error } = await window.supabaseClient
                .from('site_settings')
                .upsert({
                    setting_key: 'maintenance_mode',
                    setting_value: { enabled: true, message: message },
                    updated_at: new Date().toISOString(),
                    updated_by: 'admin'
                }, {
                    onConflict: 'setting_key'
                });

            if (error) throw error;

            console.log('✅ Mode maintenance activé');
            return true;
        } catch (err) {
            console.error('❌ Erreur activation maintenance:', err);
            throw err;
        }
    },

    // Désactiver le mode maintenance
    async disable() {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase non disponible');
            }

            const { error } = await window.supabaseClient
                .from('site_settings')
                .upsert({
                    setting_key: 'maintenance_mode',
                    setting_value: { enabled: false, message: '' },
                    updated_at: new Date().toISOString(),
                    updated_by: 'admin'
                }, {
                    onConflict: 'setting_key'
                });

            if (error) throw error;

            console.log('✅ Mode maintenance désactivé');
            return true;
        } catch (err) {
            console.error('❌ Erreur désactivation maintenance:', err);
            throw err;
        }
    },

    // Vérifier si l'utilisateur est admin
    async isAdmin() {
        const token = sessionStorage.getItem('adminToken');
        if (!token || token !== 'ADMIN_SESSION_VALID') {
            return false;
        }

        // Vérifier aussi dans Supabase si possible
        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session?.user) {
                    const { data: adminData, error } = await window.supabaseClient
                        .from('admin_users')
                        .select('id')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    return !!adminData && !error;
                }
            } catch (err) {
                console.warn('Vérification admin Supabase échouée:', err);
            }
        }

        // Fallback sur le token de session
        return true;
    },

    // Afficher la page de maintenance
    showMaintenancePage(message) {
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Maintenance - SV CHALLENGE LIST</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                    }
                    .maintenance-container {
                        text-align: center;
                        padding: 40px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                        border: 1px solid rgba(255, 255, 255, 0.18);
                        max-width: 600px;
                    }
                    .maintenance-icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                        animation: rotate 2s linear infinite;
                    }
                    @keyframes rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    h1 {
                        font-size: 36px;
                        margin-bottom: 20px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    p {
                        font-size: 18px;
                        line-height: 1.6;
                        margin-bottom: 30px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                    }
                    .admin-link {
                        display: inline-block;
                        padding: 12px 30px;
                        background: rgba(255, 255, 255, 0.2);
                        border: 2px solid white;
                        border-radius: 50px;
                        color: white;
                        text-decoration: none;
                        font-weight: bold;
                        transition: all 0.3s ease;
                    }
                    .admin-link:hover {
                        background: white;
                        color: #667eea;
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="maintenance-container">
                    <div class="maintenance-icon">🔧</div>
                    <h1>Site en Maintenance</h1>
                    <p>${message || 'Le site est actuellement en maintenance. Nous serons de retour bientôt!'}</p>
                    <a href="admin.html" class="admin-link">🔐 Accès Admin</a>
                </div>
            </body>
            </html>
        `;
    },

    // Vérifier et rediriger si nécessaire
    async checkAndRedirect() {
        // Ne pas vérifier sur la page admin
        if (window.location.pathname.includes('admin.html') ||
            window.location.pathname.includes('admin-')) {
            return;
        }

        const isInMaintenance = await this.isMaintenanceMode();
        const isUserAdmin = await this.isAdmin();

        if (isInMaintenance && !isUserAdmin) {
            const settings = await this.getMaintenanceSettings();
            this.showMaintenancePage(settings.message);
        }
    }
};

// Pour le panneau admin - Toggle la section maintenance
function toggleMaintenanceMode() {
    const section = document.getElementById('maintenanceSection');
    if (section) {
        const isVisible = section.style.display !== 'none';
        section.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            loadMaintenanceSettings();
        }
    }
}

// Charger les paramètres actuels
async function loadMaintenanceSettings() {
    try {
        const settings = await maintenanceManager.getMaintenanceSettings();
        const statusElement = document.getElementById('maintenanceStatus');
        const messageElement = document.getElementById('maintenanceMessage');

        if (statusElement) {
            statusElement.textContent = settings.enabled ? 'Activé' : 'Désactivé';
            statusElement.className = 'status-badge ' + (settings.enabled ? 'active' : 'inactive');
        }

        if (messageElement) {
            messageElement.value = settings.message || 'Le site est actuellement en maintenance. Nous serons de retour bientôt!';
        }
    } catch (err) {
        console.error('Erreur chargement paramètres:', err);
    }
}

// Activer la maintenance
async function enableMaintenance() {
    const messageElement = document.getElementById('maintenanceMessage');
    const message = messageElement ? messageElement.value : 'Le site est en maintenance.';

    if (!confirm('⚠️ Voulez-vous vraiment activer le mode maintenance?\n\nLe site ne sera accessible qu\'aux administrateurs.')) {
        return;
    }

    try {
        await maintenanceManager.enable(message);
        alert('✅ Mode maintenance activé avec succès!');
        loadMaintenanceSettings();
    } catch (err) {
        alert('❌ Erreur lors de l\'activation: ' + err.message);
    }
}

// Désactiver la maintenance
async function disableMaintenance() {
    if (!confirm('Voulez-vous vraiment désactiver le mode maintenance?\n\nLe site sera à nouveau accessible à tous.')) {
        return;
    }

    try {
        await maintenanceManager.disable();
        alert('✅ Mode maintenance désactivé avec succès!');
        loadMaintenanceSettings();
    } catch (err) {
        alert('❌ Erreur lors de la désactivation: ' + err.message);
    }
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = maintenanceManager;
}
