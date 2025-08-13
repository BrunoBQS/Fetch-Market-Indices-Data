function app() {
    return {
        // Core State
        db: null,
        userId: null,
        appId: null,
        isDataLoaded: false,
        saveTimeout: null,
        fmpApiKey: 'hSHyvTrcUYFXUkm5NnUCjoc1LcYe85GD',
        alphaVantageApiKey: 'BLHVEZ1H9OG6QYU7',
        isUpdatingPrices: false,
        lastUpdated: 'Nunca',
        autoRefreshIntervalId: null,
        isLoggedIn: false,
        loginUsername: 'Bruno',
        history: [],

        // UI State
        mainTab: 'resumo',
        showCalculatorModal: false,
        txType: 'buy',
        irTab: 'saldos',
        portfolioSubTab: 'portfolio',
        plNeutralRange: 1,
        isModalOpen: false,
        showResetConfirmation: false,
        showUndoConfirmation: false,
        isLoadingAnalysis: false,
        analysisResult: '',
        toastMessage: '',
        showToast: false,
        summarySortCriteria: 'valorizacao',
        isSidebarCollapsed: false,
        isFetchingInfo: { newTx: false, updateAsset: false, crypto: false },
        infoPopup: { show: false, title: '', content: '' },
        marketIndices: {
            'SPX': { name: 'S&P 500', price: 0, change: 0, ticker: 'SPX' },
            'DJI': { name: 'Dow Jones', price: 0, change: 0, ticker: 'DJI' },
            'IXIC': { name: 'Nasdaq Comp.', price: 0, change: 0, ticker: 'IXIC' },
            'RUT': { name: 'Russell 2000', price: 0, change: 0, ticker: 'RUT' },
            'VIX': { name: 'VIX Volatility', price: 0, change: 0, ticker: 'VIX' },
            'DVOL': { name: 'DVOL Index', price: 0, change: 0, ticker: 'DVOL' }
        },

        // ESCOLHAS DO USUARIO DA CALCULADORA
        calculatorSettings: {
            fontSize: 'text-xl',
            opacity: 100,
        },

        // BLOCO DA CALCULADORA
        calculator: {
            display: '0',
            expression: '&nbsp;',
            previousValue: '',
            operation: null,
            shouldResetDisplay: false,
            isDragging: false,
            isResizing: false,
            isMinimized: false,
            modalElement: null,
            initialMouseX: 0,
            initialMouseY: 0,
            initialX: 0,
            initialY: 0,
            scale: 1.0,
            initialScale: 1.0,
            showMemory: false,
            memoryHistory: [],
            x: null, 
            y: null,
            handleMouseDown(event) {
                this.modalElement = event.currentTarget;
                if (this.x === null) {
                    this.x = this.modalElement.offsetLeft;
                    this.y = this.modalElement.offsetTop;
                }
                const target = event.target;
                if (target.classList.contains('resize-handle-br') || target.classList.contains('resize-handle-bl') || target.classList.contains('resize-handle-tr') || target.classList.contains('resize-handle-tl')) {
                    this.startResize(event);
                } else if (target.closest('.draggable-header')) {
                    this.startDrag(event);
                }
            },
            startDrag(event) {
                this.isDragging = true;
                this.initialMouseX = event.clientX;
                this.initialMouseY = event.clientY;
                this.initialX = this.x;
                this.initialY = this.y;
                const onDrag = (e) => {
                    if (!this.isDragging) return;
                    const dx = e.clientX - this.initialMouseX;
                    const dy = e.clientY - this.initialMouseY;
                    this.x = this.initialX + dx;
                    this.y = this.initialY + dy;
                };
                const endDrag = () => {
                    this.isDragging = false;
                    window.removeEventListener('mousemove', onDrag);
                    window.removeEventListener('mouseup', endDrag);
                };
                window.addEventListener('mousemove', onDrag);
                window.addEventListener('mouseup', endDrag);
            },
            startResize(event) {
                this.isResizing = true;
                this.initialMouseX = event.clientX;
                this.initialScale = this.scale;
                const onResize = (e) => {
                    if (!this.isResizing) return;
                    const dx = e.clientX - this.initialMouseX;
                    let newScale = this.initialScale + (dx / 200);
                    if (newScale < 0.75) newScale = 0.75;
                    if (newScale > 2.5) newScale = 2.5;
                    this.scale = newScale;
                };
                const endResize = () => {
                    this.isResizing = false;
                    window.removeEventListener('mousemove', onResize);
                    window.removeEventListener('mouseup', endResize);
                };
                window.addEventListener('mousemove', onResize);
                window.addEventListener('mouseup', endResize);
            },
            toggleMinimize() {
                this.isMinimized = !this.isMinimized;
                this.showMemory = false;
            },
            clear() {
                this.display = '0';
                this.previousValue = '';
                this.operation = null;
                this.shouldResetDisplay = false;
                this.memoryHistory = [];
                this.updateExpressionDisplay();
            },
            backspace() {
                if (this.shouldResetDisplay) { this.clear(); return; }
                if(this.display.length > 1) { this.display = this.display.slice(0, -1); } 
                else { this.display = '0'; }
                this.updateExpressionDisplay();
            },
            appendNumber(number) {
                if (this.display.length > 15) return;
                if (this.display === '0' || this.shouldResetDisplay) {
                    this.display = number;
                    this.shouldResetDisplay = false;
                } else {
                    this.display += number;
                }
                this.updateExpressionDisplay();
            },
            appendDecimal() {
                if (this.shouldResetDisplay) {
                    this.display = '0.';
                    this.shouldResetDisplay = false;
                } else if (!this.display.includes('.')) {
                    this.display += '.';
                }
                this.updateExpressionDisplay();
            },
            chooseOperation(op) {
                if(this.display === '' && this.previousValue === '') return;
                if (this.previousValue !== '' && !this.shouldResetDisplay) { this.calculate(); }
                this.operation = op;
                this.previousValue = this.display;
                this.shouldResetDisplay = true;
                this.updateExpressionDisplay();
            },
            calculate() {
                let result;
                const prev = parseFloat(this.previousValue);
                const current = parseFloat(this.display);
                if (isNaN(prev) || isNaN(current) || !this.operation) return;
                const opSymbol = this.operation === '*' ? 'x' : this.operation === '/' ? '÷' : this.operation;
                const fullExpression = `${this.previousValue} ${opSymbol} ${this.display}`;
                switch (this.operation) {
                    case '+': result = prev + current; break;
                    case '-': result = prev - current; break;
                    case '*': result = prev * current; break;
                    case '/':
                        if (current === 0) { this.display = 'Erro'; this.expression = '&nbsp;'; setTimeout(() => this.clear(), 1500); return; }
                        result = prev / current;
                        break;
                    default: return;
                }
                this.memoryHistory.unshift({ expression: fullExpression, result: result.toString() });
                if (this.memoryHistory.length > 15) { this.memoryHistory.pop(); }
                this.expression = `${fullExpression} =`;
                this.display = result.toString();
                this.operation = null;
                this.previousValue = '';
                this.shouldResetDisplay = true;
            },
            setPercent() {
                if (this.display === '') return;
                this.display = (parseFloat(this.display) / 100).toString();
                this.updateExpressionDisplay();
            },
            updateExpressionDisplay() {
                if(this.operation) {
                    let opSymbol = this.operation === '*' ? 'x' : this.operation === '/' ? '÷' : this.operation;
                    if (this.shouldResetDisplay) {
                        this.expression = `${this.previousValue} ${opSymbol}`;
                    } else {
                        this.expression = `${this.previousValue} ${opSymbol} ${this.display}`;
                    }
                } else {
                    this.expression = this.shouldResetDisplay ? this.display : '&nbsp;';
                }
            },
            handleAction(action) {
                switch(action) {
                    case 'clear': this.clear(); break;
                    case 'backspace': this.backspace(); break;
                    case 'calculate': this.calculate(); break;
                    case 'decimal': this.appendDecimal(); break;
                    case 'percent': this.setPercent(); break;
                    case 'memory': this.showMemory = !this.showMemory; break;
                }
            }
        },

        assetAlerts: {},
        isAlertModalOpen: false,
        alertConfig: {
            ticker: '',
            valorizarPercent: null,
            desvalorizarPercent: null,
            period: 'mes'
        },

        newTx: { name: '', ticker: '', qty: null, price: null, sellValue: null, reinvest: false, type: 'Ação' },
        updateAsset: { name: '', ticker: '', qty: null, avgPrice: null, type: 'Ação' },
        newCryptoTx: { coldwallet: 'Ledger Nano X', customWallet: '', coin: 'BTC', customCoin: '', qty: null, totalValue: null, coinPrice: null },
        userSettings: {
            name: 'Usuário',
            username: 'usuario',
            updateReminderDate: '',
            currency: 'USD',
            exchangeRate: 5.25,
            theme: 'theme-dark',
            autoRefreshInterval: 'manual',
        },
        tempUserSettings: {},
        portfolioAssets: [],
        cryptoAssets: [],
        irData: { saldos: [], aportes: [], comprasVendas: [], proventos: [], remessas: [] },
        projections: {
            valorInicialBRL: null,
            valorAtualBRL: null,
            mesesDecorridos: 12,
            aporteMensalBRL: null,
            usePortfolioData: true,
            selectedGoal: 100000,
            results: null
        },
        goals: [50000, 100000, 250000, 500000, 1000000],
        cryptoList: [
            { ticker: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
            { ticker: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
            { ticker: 'XRP', name: 'XRP (Ripple)', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
            { ticker: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png' },
            { ticker: 'BNB', name: 'Binance Coin', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
            { ticker: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
            { ticker: 'USDC', name: 'USD Coin', logo: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png' },
            { ticker: 'stETH', name: 'Lido Staked Ether', logo: 'https://assets.coingecko.com/coins/images/13442/large/steth_logo.png' },
            { ticker: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
            { ticker: 'TRX', name: 'TRON', logo: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
            { ticker: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
            { ticker: 'HYPE', name: 'Hyperliquid', logo: 'https://i.imgur.com/8c22q4B.png' },
            { ticker: 'SUI', name: 'Sui', logo: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset_logo.png' },
            { ticker: 'XLM', name: 'Stellar', logo: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png' },
            { ticker: 'LINK', name: 'Chainlink', logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
            { ticker: 'OTHER', name: 'Outra', logo: '' },
        ],
        coldWalletList: [
            'BitBox02', 'Bitkey', 'Coinkite ColdCard', 'ELLIPAL Titan 2.0', 'Gridplus Lattice 1', 'Ledger Flex', 'Ledger Nano S Plus', 'Ledger Nano X', 'Ledger Staxx', 'NGRAVE ZERO', 'SafePal S1', 'SafePal S1 Pro', 'Tangem Wallet', 'Trezor Model One', 'Trezor Model T', 'Trezor Safe 3', 'Trezor Safe 5', 'Outra'
        ],
        menuItems: [
            { tab: 'resumo', label: 'Resumo', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h10"/><path d="M11 16h7"/><path d="M11 20h4"/></svg>' },
            { tab: 'portfolio', label: 'Portfólio', icon: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25-2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m12 0V9" /></svg>' },
            { tab: 'metas', label: 'Metas', icon: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>' },
            { tab: 'ir', label: 'Imposto de Renda', icon: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>' },
            { tab: 'automation', label: 'Automação', icon: '<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>' },
            { tab: 'config', label: 'Configurações', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>' }
        ],

        get pageTitle() {
            const titles = {
                resumo: 'Resumo da Carteira',
                portfolio: 'Portfólio',
                metas: 'Metas e Projeções',
                ir: 'Imposto de Renda',
                automation: 'Automação',
                config: 'Configurações'
            };
            return titles[this.mainTab] || 'DeX-Tron';
        },
        get allAssets() {
            const combined = [
                ...this.portfolioAssets.map(a => ({...a, typeAsset: 'stock' })),
                ...this.cryptoAssets.map(c => ({
                    ...c,
                    name: c.name,
                    ticker: c.ticker,
                    qty: c.qty,
                    currentPrice: c.coinPrice,
                    avgPrice: c.totalValue / c.qty,
                    typeAsset: 'crypto'
                }))
            ];
            return combined.map(asset => ({
                ...asset,
                dailyChangePercent: parseFloat(asset.dailyChangePercent) || 0,
                currentValue: (asset.qty || 0) * (asset.currentPrice || 0),
                intradayData: asset.intradayData || []
            }));
        },
        get sortedAssets() {
            const sorted = [...this.allAssets];
            switch (this.summarySortCriteria) {
                case 'valorizacao':
                    return sorted.sort((a, b) => b.dailyChangePercent - a.dailyChangePercent);
                case 'desvalorizacao':
                    return sorted.sort((a, b) => a.dailyChangePercent - b.dailyChangePercent);
                case 'variacao':
                    return sorted.sort((a, b) => Math.abs(b.dailyChangePercent) - Math.abs(a.dailyChangePercent));
                default:
                    return sorted;
            }
        },
        get etfAssets() {
            return [...this.portfolioAssets].filter(a => a.type === 'ETF').sort((a, b) => a.ticker.localeCompare(b.ticker));
        },
        get reitAssets() {
            return [...this.portfolioAssets].filter(a => a.type === 'REIT').sort((a, b) => a.ticker.localeCompare(b.ticker));
        },
        get otherAssets() {
            return [...this.portfolioAssets].filter(a => a.type !== 'ETF' && a.type !== 'REIT').sort((a, b) => a.ticker.localeCompare(b.ticker));
        },
        get totalPortfolioValueUSD() {
            return this.allAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
        },
        get totalDailyPL() {
            return this.allAssets.reduce((sum, asset) => {
                const priceYesterday = asset.currentPrice / (1 + (asset.dailyChangePercent / 100));
                const changeValue = (asset.currentPrice - priceYesterday) * asset.qty;
                return sum + (isNaN(changeValue) ? 0 : changeValue);
            }, 0);
        },
        get totalDailyPLPercent() {
            const totalValueYesterday = this.totalPortfolioValueUSD - this.totalDailyPL;
            if (totalValueYesterday === 0) return 0;
            return (this.totalDailyPL / totalValueYesterday) * 100;
        },
        get dividendSummary() {
            if (!this.irData || !this.irData.proventos) return [];
            const summary = this.irData.proventos.reduce((acc, provento) => {
                const ticker = provento.ticker.toUpperCase();
                if (!ticker) return acc;
                if (!acc[ticker]) {
                    acc[ticker] = { ticker: ticker, totalBruto: 0, totalLiquido: 0 };
                }
                acc[ticker].totalBruto += this.parseCurrencyValue(provento.bruto);
                acc[ticker].totalLiquido += this.parseCurrencyValue(provento.liquido);
                return acc;
            }, {});
            return Object.values(summary).sort((a, b) => a.ticker.localeCompare(b.ticker));
        },

        async fetchMarketData() {
            if (!this.alphaVantageApiKey) {
                console.warn("Chave da API Alpha Vantage não configurada.");
                return;
            }
            // <-- VIX FOI REMOVIDO DAQUI E AGORA É BUSCADO PELA API DA DERIBIT
            const apiPromises = Object.keys(this.marketIndices)
                .filter(ticker => ticker !== 'DVOL') // Apenas o DVOL é filtrado aqui
                .map(ticker => {
                    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.alphaVantageApiKey}`;
                    return fetch(url).then(response => response.json()).catch(error => {
                        console.error(`Erro ao buscar ${ticker}:`, error);
                        return null;
                    });
                });
            try {
                const results = await Promise.all(apiPromises);
                results.forEach(result => {
                    if (result && result['Global Quote']) {
                        const quote = result['Global Quote'];
                        const ticker = quote['01. symbol'];
                        if (ticker && this.marketIndices[ticker]) {
                            this.marketIndices[ticker].price = parseFloat(quote['05. price']) || 0;
                            this.marketIndices[ticker].change = parseFloat(quote['10. change percent'].replace('%', '')) || 0;
                        }
                    } else if (result && (result.Note || result.Information)) {
                        console.warn("Nota ou Informação da API Alpha Vantage:", result.Note || result.Information);
                        this.showAppToast('Limite ou aviso da API de índices. Tente mais tarde.');
                    }
                });
            } catch (error) {
                console.error("Erro ao processar os dados dos índices de mercado:", error);
                this.showAppToast('Falha ao atualizar os índices de mercado.');
            }
        },


// NOVA FUNÇÃO PARA LER O JSON LOCAL
        async fetchIndicesFromJSON() {
            try {
                // Adicionamos um parâmetro para evitar que o navegador use uma versão antiga (cache) do arquivo
                const url = `indices.json?t=${new Date().getTime()}`;
                const response = await fetch(url);
                if (!response.ok) { // Verifica se o arquivo foi encontrado
                    throw new Error('Arquivo indices.json não encontrado. A Action já rodou?');
                }
                const data = await response.json();

                // Atualiza os dados na tela
                for (const ticker in data) {
                    if (this.marketIndices[ticker]) {
                        this.marketIndices[ticker].price = data[ticker].price;
                        this.marketIndices[ticker].change = data[ticker].change;
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar o arquivo de índices:", error);
                this.showAppToast('Falha ao carregar dados dos índices.');
            }
        },

        get marketHoursBRT() { /*...*/ },
        getIndexIcon(ticker) { /*...*/ },
        getVixColorClass(price) { /*...*/ },
        getDvolColorClass(price) { /*...*/ },

        init() {
            this.fetchIndicesFromJSON(); // <- MUDANÇA AQUI
            console.log("App Alpine inicializado. Aguardando login do usuário.");
            this.$watch('mainTab', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('portfolioSubTab', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('isAlertModalOpen', (isOpen) => { if (isOpen) this.$nextTick(() => lucide.createIcons()); });
            this.$watch('calculatorSettings.opacity', (newValue) => {
                const modal = document.querySelector('.draggable-modal');
                if (modal) modal.style.opacity = newValue / 100;
            });
        },
        
        manualRefresh() {
            if (this.mainTab === 'config') {
                this.showAppToast('Atualizando índices de mercado...');
                this.fetchIndicesFromJSON(); // <- MUDANÇA AQUI
            } else {
                this.showAppToast('Atualizando cotações...');
                this.fetchAllAssetPrices();
                this.fetchIndicesFromJSON(); // <- MUDANÇA AQUI
            }
        },

        // FUNÇÃO CORRETA E DEFINITIVA para o DVOL
        async fetchDvolIndex() {
    try {
        const response = await fetch('https://www.deribit.com/api/v2/public/get_index?currency=BTC');
        const data = await response.json();
        console.log('Resposta da Deribit:', data); // <-- ADICIONE ESTA LINHA

        if (data && data.result && data.result.BTC) {
            this.marketIndices['DVOL'].price = data.result.BTC;
        }
    } catch (error) {
        console.error("Erro ao buscar DVOL Index da Deribit:", error);
    }
},

        get marketHoursBRT() {
            const nyTimezone = 'America/New_York';
            const now = new Date();
            const nyFormatter = new Intl.DateTimeFormat('en-US', { timeZone: nyTimezone, timeZoneName: 'short' });
            const parts = nyFormatter.formatToParts(now);
            const timeZoneAbbr = parts.find(p => p.type === 'timeZoneName').value;
            const isDST = timeZoneAbbr === 'EDT';
            return isDST ? '10:30 às 17:00 BRT' : '11:30 às 18:00 BRT';
        },

        getIndexIcon(ticker) {
            const index = this.marketIndices[ticker];
            if (!index) return '';
            const change = parseFloat(index.change);
            if (change > 0) return '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>';
            if (change < 0) return '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>';
            return '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>';
        },

        getVixColorClass(price) {
            const value = parseFloat(price);
            if (value >= 30) return 'border-b-4 border-b-[#c20000]';
            if (value >= 20) return 'border-b-4 border-b-[#ff9d00]';
            if (value >= 14) return 'border-b-4 border-b-[#52ff33]';
            return 'border-b-4 border-b-[#010db6]';
        },

        getDvolColorClass(price) {
            const value = parseFloat(price);
            if (value >= 80) return 'border-b-4 border-b-[#c20000]';
            if (value >= 60) return 'border-b-4 border-b-[#ff9d00]';
            if (value >= 40) return 'border-b-4 border-b-[#52ff33]';
            return 'border-b-4 border-b-[#010db6]';
        },

        init() {
            this.fetchMarketData();
            this.fetchDvolIndex(); // <-- CHAMADA AQUI para DVOL
            console.log("App Alpine inicializado. Aguardando login do usuário.");
            this.$watch('mainTab', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('portfolioSubTab', () => this.$nextTick(() => lucide.createIcons()));
            this.$watch('isAlertModalOpen', (isOpen) => { if (isOpen) this.$nextTick(() => lucide.createIcons()); });
            this.$watch('calculatorSettings.opacity', (newValue) => {
                const modal = document.querySelector('.draggable-modal');
                if (modal) modal.style.opacity = newValue / 100;
            });
        },
        login() {
            if (!this.loginUsername.trim()) {
                this.showAppToast("Por favor, insira um nome de usuário.");
                return;
            }
            this.userId = this.loginUsername.trim().toLowerCase();
            this.isLoggedIn = true;
            this.startFirebase();
        },
        logout() {
            window.location.reload();
        },
        async startFirebase() {
            console.log("Inicializando o App e o Firebase para o usuário:", this.userId);
            this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                console.error("Firebase não foi inicializado corretamente.");
                this.showAppToast("Erro crítico: Falha na inicialização do app.");
                return;
            }
            try {
                this.db = firebase.firestore();
                const auth = firebase.auth();
                if (!auth.currentUser) {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await auth.signInWithCustomToken(__initial_auth_token);
                        } else {
                            await auth.signInAnonymously();
                        }
                    } catch (authError) {
                        console.error("Erro durante a autenticação:", authError);
                    }
                }
                this.loadData();
                this.$watch('projections.valorInicialBRL', () => this.runProjectionCalculations());
                this.$watch('projections.valorAtualBRL', () => this.runProjectionCalculations());
                this.$watch('projections.mesesDecorridos', () => this.runProjectionCalculations());
                this.$watch('projections.aporteMensalBRL', () => this.runProjectionCalculations());
                this.$watch('projections.selectedGoal', () => this.runProjectionCalculations());
                this.$watch('userSettings.exchangeRate', () => this.runProjectionCalculations());
                this.$watch('projections.usePortfolioData', (newValue) => {
                    if (newValue) {
                        this.projections.valorAtualBRL = this.totalPortfolioValueUSD * this.userSettings.exchangeRate;
                    }
                    this.runProjectionCalculations();
                });
            } catch (e) {
                console.error("Erro fatal na inicialização:", e);
                this.showAppToast("Não foi possível iniciar o aplicativo.");
            }
        },
        loadData() {
            if (!this.userId || !this.appId) return;
            const docRef = this.db.collection('artifacts').doc(this.appId).collection('public').doc('data').collection('user_portfolios').doc(this.userId);
            docRef.onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    const data = docSnap.data();
                    this.userSettings = { ...this.userSettings, ...data.userSettings };
                    this.portfolioAssets = data.portfolioAssets || [];
                    this.cryptoAssets = data.cryptoAssets || [];
                    this.assetAlerts = data.assetAlerts || {};
                    const defaultIrData = { saldos: [], aportes: [], comprasVendas: [], proventos: [], remessas: [] };
                    this.irData = { ...defaultIrData, ...data.irData };
                    this.tempUserSettings = JSON.parse(JSON.stringify(this.userSettings));
                    document.documentElement.className = this.userSettings.theme || 'theme-dark';
                    if (this.projections.usePortfolioData) {
                        this.projections.valorAtualBRL = this.totalPortfolioValueUSD * this.userSettings.exchangeRate;
                    }
                    this.runProjectionCalculations();
                    this.setupAutoRefresh();
                } else {
                    console.log("Nenhum documento encontrado. Criando um novo.");
                    this.userSettings.username = this.loginUsername.trim();
                    this.userSettings.name = this.loginUsername.trim();
                    this.tempUserSettings = JSON.parse(JSON.stringify(this.userSettings));
                    this.saveData();
                }
                if (!this.isDataLoaded) {
                    this.isDataLoaded = true;
                    this.$nextTick(() => lucide.createIcons());
                }
            }, (error) => {
                console.error("Erro no listener do Firestore:", error);
                this.isDataLoaded = true;
            });
        },
        getCurrentState() {
            return JSON.parse(JSON.stringify({
                portfolioAssets: this.portfolioAssets,
                cryptoAssets: this.cryptoAssets,
                irData: this.irData,
                assetAlerts: this.assetAlerts
            }));
        },
        saveStateToHistory(description) {
            this.history.push({
                state: this.getCurrentState(),
                description: description
            });
        },
        undoLastAction() {
            this.showUndoConfirmation = false;
            if (this.history.length > 0) {
                const lastStateObj = this.history.pop();
                this.portfolioAssets = lastStateObj.state.portfolioAssets;
                this.cryptoAssets = lastStateObj.state.cryptoAssets;
                this.irData = lastStateObj.state.irData;
                this.assetAlerts = lastStateObj.state.assetAlerts;
                this.saveData();
                this.showAppToast('Última ação desfeita.');
            }
        },
        async saveData() {
            if (!this.userId || !this.appId) return;
            try {
                const portfolioToSave = JSON.parse(JSON.stringify(this.portfolioAssets)).map(asset => { delete asset.justUpdated; return asset; });
                const cryptoToSave = JSON.parse(JSON.stringify(this.cryptoAssets)).map(asset => { delete asset.justUpdated; return asset; });
                const docRef = this.db.collection('artifacts').doc(this.appId).collection('public').doc('data').collection('user_portfolios').doc(this.userId);
                await docRef.set({
                    userSettings: JSON.parse(JSON.stringify(this.userSettings)),
                    portfolioAssets: portfolioToSave,
                    cryptoAssets: cryptoToSave,
                    irData: JSON.parse(JSON.stringify(this.irData)),
                    assetAlerts: JSON.parse(JSON.stringify(this.assetAlerts))
                }, { merge: true });
            } catch (error) {
                console.error("Erro ao salvar dados:", error);
            }
        },
        saveDataDebounced() {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.saveData(), 1500);
        },
        showAppToast(message) {
            this.toastMessage = message;
            this.showToast = true;
            setTimeout(() => this.showToast = false, 3000);
        },
        saveSettings() {
            this.saveStateToHistory('Alteração de configurações');
            this.userSettings = JSON.parse(JSON.stringify(this.tempUserSettings));
            this.saveData();
            this.setupAutoRefresh();
            this.showAppToast('Configurações salvas!');
        },
        resetPortfolio() {
            this.saveStateToHistory('Reset completo da carteira');
            this.portfolioAssets = [];
            this.cryptoAssets = [];
            this.irData = { saldos: [], aportes: [], comprasVendas: [], proventos: [], remessas: [] };
            this.assetAlerts = {};
            this.saveData();
            this.showResetConfirmation = false;
            this.showAppToast('Sua carteira foi resetada.');
        },
        setTheme(themeName) {
            this.userSettings.theme = themeName;
            this.tempUserSettings.theme = themeName;
            this.saveDataDebounced();
        },
        parseCurrencyValue(str) {
            if (typeof str !== 'string') return 0;
            const cleanedStr = str.replace(/[^0-9,.-]+/g, "").replace(/\./g, '').replace(',', '.');
            return isNaN(parseFloat(cleanedStr)) ? 0 : parseFloat(cleanedStr);
        },
        formatCurrency(value) {
            if (typeof value !== 'number') {
                return this.userSettings.currency === 'BRL' ? 'R$0,00' : '$0.00';
            }
            if (this.userSettings.currency === 'BRL' && this.userSettings.exchangeRate > 0) {
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value * this.userSettings.exchangeRate);
            }
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        },
        registerCrypto() {
            const isCustomWallet = this.newCryptoTx.coldwallet === 'Outra';
            const walletName = isCustomWallet ? this.newCryptoTx.customWallet : this.newCryptoTx.coldwallet;
            if (!this.newCryptoTx.coin || !walletName || !this.newCryptoTx.qty || !this.newCryptoTx.totalValue || !this.newCryptoTx.coinPrice) {
                this.showAppToast('Erro: Preencha todos os campos obrigatórios.'); return;
            }
            let coinName, coinTicker, coinLogo, isCustomCoin;
            if (this.newCryptoTx.coin === 'OTHER') {
                if (!this.newCryptoTx.customCoin) { this.showAppToast('Erro: Insira o nome da moeda personalizada.'); return; }
                coinName = this.newCryptoTx.customCoin; coinTicker = this.newCryptoTx.customCoin.toUpperCase();
                coinLogo = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e6edf3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 7h-5.5a3.5 3.5 0 1 0 0 7h5.5a3.5 3.5 0 1 1 0 7H6'/%3E%3Cpath d='M12 18V6'/%3E%3Cpath d='M12 12h-2'/%3E%3C/svg%3E`;
                isCustomCoin = true;
            } else {
                const coinInfo = this.cryptoList.find(c => c.ticker === this.newCryptoTx.coin);
                if (!coinInfo) { this.showAppToast('Erro: Moeda selecionada é inválida.'); return; }
                coinName = coinInfo.name; coinTicker = coinInfo.ticker; coinLogo = coinInfo.logo; isCustomCoin = false;
            }
            const newAsset = { qty: this.newCryptoTx.qty, totalValue: this.newCryptoTx.totalValue, coinPrice: this.newCryptoTx.coinPrice, ticker: coinTicker, name: coinName, logo: coinLogo, coldwallet: walletName, isCustom: isCustomCoin };
            this.saveStateToHistory(`Registro de ${newAsset.qty} ${newAsset.ticker}`);
            this.cryptoAssets.push(newAsset);
            this.flashCryptoRow(this.cryptoAssets.length - 1);
            this.saveDataDebounced();
            this.newCryptoTx = { coldwallet: 'Ledger Nano X', customWallet: '', coin: 'BTC', customCoin: '', qty: null, totalValue: null, coinPrice: null };
            this.showAppToast('Criptomoeda registrada com sucesso!');
        },
        deleteCryptoAsset(index) {
            this.saveStateToHistory(`Exclusão do criptoativo ${this.cryptoAssets[index].ticker}`);
            this.cryptoAssets.splice(index, 1);
            this.saveDataDebounced();
        },
        async registerTransaction() {
            const tickerUpper = this.newTx.ticker.toUpperCase();
            const existingAsset = this.portfolioAssets.find(a => a.ticker.toUpperCase() === tickerUpper);

            if (this.txType === 'dividend') {
                this.saveStateToHistory(`Dividendo de ${this.formatCurrency(this.newTx.price)} de ${tickerUpper}`);
                if (!existingAsset) { this.showAppToast('Você precisa possuir o ativo para registrar dividendos.'); return; }
                const grossValue = this.newTx.price;
                const netValue = grossValue * 0.70;
                const taxValue = grossValue - netValue;
                existingAsset.realizedProfit = (existingAsset.realizedProfit || 0) + netValue;
                if (this.newTx.reinvest) {
                    if (existingAsset.currentPrice > 0) {
                        const qtyToBuy = netValue / existingAsset.currentPrice;
                        const newTotalCost = (existingAsset.avgPrice * existingAsset.qty) + netValue;
                        const newTotalQty = existingAsset.qty + qtyToBuy;
                        existingAsset.avgPrice = newTotalCost / newTotalQty;
                        existingAsset.qty = newTotalQty;
                        this.showAppToast(`Reinvestido: ${qtyToBuy.toFixed(4)} cotas de ${tickerUpper} compradas.`);
                    }
                }
                this.irData.proventos.push({ data: new Date().toLocaleDateString('pt-BR'), ticker: tickerUpper, ativo: this.newTx.name, tipo: 'Dividendo', bruto: `$${grossValue.toFixed(2)}`, imposto: `$${taxValue.toFixed(2)}`, liquido: `$${netValue.toFixed(2)}`, obs: 'Registrado via App' });
                this.flashRow(tickerUpper);
            } else if (this.txType === 'buy') {
                if (!tickerUpper || !this.newTx.name || !this.newTx.qty || !this.newTx.price) { this.showAppToast('Erro: Preencha todos os campos obrigatórios.'); return; }
                this.saveStateToHistory(`Compra de ${this.newTx.qty} de ${tickerUpper}`);
                if (existingAsset) {
                    const newTotalCost = (existingAsset.avgPrice * existingAsset.qty) + (this.newTx.price * this.newTx.qty);
                    const newTotalQty = existingAsset.qty + this.newTx.qty;
                    existingAsset.avgPrice = newTotalCost / newTotalQty;
                    existingAsset.qty = newTotalQty;
                } else {
                    const details = await this.fetchAssetDetails(tickerUpper);
                    this.portfolioAssets.push({ name: this.newTx.name, ticker: tickerUpper, qty: this.newTx.qty, avgPrice: this.newTx.price, type: this.newTx.type, currentPrice: details.price || this.newTx.price, dailyChangePercent: 0, dividendFrequency: 'anual', dividendYield: details.dividendYield || null, realizedProfit: 0, nextDividendPayDate: '' });
                }
                this.irData.comprasVendas.push({ data: new Date().toLocaleDateString('pt-BR'), tipo: 'Compra', ticker: tickerUpper, ativo: this.newTx.name, qtd: this.newTx.qty, preco: `$${this.newTx.price.toFixed(2)}`, total: `$${(this.newTx.qty * this.newTx.price).toFixed(2)}`, corretora: '', obs: 'Registrado via App' });
                this.flashRow(tickerUpper);
            } else if (this.txType === 'sell') {
                if (!existingAsset) { this.showAppToast('Você não possui este ativo para vender.'); return; }
                if (!this.newTx.sellValue || !this.newTx.price) { this.showAppToast('Preencha o valor da venda e o preço por ação.'); return; }
                this.saveStateToHistory(`Venda de ${this.formatCurrency(this.newTx.sellValue)} de ${tickerUpper}`);
                const qtyToSell = this.newTx.sellValue / this.newTx.price;
                if (qtyToSell > existingAsset.qty) { this.showAppToast('Quantidade de venda maior que a posição atual.'); return; }
                const saleProfit = (this.newTx.price - existingAsset.avgPrice) * qtyToSell;
                existingAsset.realizedProfit = (existingAsset.realizedProfit || 0) + saleProfit;
                existingAsset.qty -= qtyToSell;
                this.irData.comprasVendas.push({ data: new Date().toLocaleDateString('pt-BR'), tipo: 'Venda', ticker: tickerUpper, ativo: this.newTx.name, qtd: qtyToSell.toFixed(4), preco: `$${this.newTx.price.toFixed(2)}`, total: `$${this.newTx.sellValue.toFixed(2)}`, corretora: '', obs: 'Registrado via App' });
                this.flashRow(tickerUpper);
                if (existingAsset.qty < 0.000001) {
                    this.portfolioAssets = this.portfolioAssets.filter(a => a.ticker.toUpperCase() !== tickerUpper);
                }
            }
            this.newTx = { name: '', ticker: '', qty: null, price: null, sellValue: null, reinvest: false, type: 'Ação' };
            this.saveDataDebounced();
            this.showAppToast('Transação registrada com sucesso!');
        },
        flashRow(ticker) {
            const asset = this.portfolioAssets.find(a => a.ticker === ticker);
            if (asset) {
                asset.justUpdated = true;
                setTimeout(() => { asset.justUpdated = false; }, 2000);
            }
        },
        flashCryptoRow(index) {
            const asset = this.cryptoAssets[index];
            if (asset) {
                asset.justUpdated = true;
                setTimeout(() => { asset.justUpdated = false; }, 2000);
            }
        },
        async updatePortfolioAsset() {
            if (!this.updateAsset.ticker || !this.updateAsset.qty || !this.updateAsset.avgPrice) return;
            const ticker = this.updateAsset.ticker.toUpperCase();
            this.saveStateToHistory(`Atualização da posição de ${ticker}`);
            const existingAsset = this.portfolioAssets.find(a => a.ticker.toUpperCase() === ticker);
            const details = await this.fetchAssetDetails(ticker);
            if (existingAsset) {
                existingAsset.name = this.updateAsset.name || existingAsset.name;
                existingAsset.qty = this.updateAsset.qty;
                existingAsset.avgPrice = this.updateAsset.avgPrice;
                existingAsset.type = this.updateAsset.type;
                existingAsset.currentPrice = details.price || this.updateAsset.avgPrice;
                existingAsset.dividendYield = details.dividendYield || existingAsset.dividendYield;
            } else {
                this.portfolioAssets.push({ name: this.updateAsset.name || details.name || 'Nome não informado', ticker: ticker, qty: this.updateAsset.qty, avgPrice: this.updateAsset.avgPrice, type: this.updateAsset.type, currentPrice: details.price || this.updateAsset.avgPrice, dailyChangePercent: 0, dividendFrequency: 'anual', dividendYield: details.dividendYield || null, realizedProfit: 0, nextDividendPayDate: '' });
            }
            this.flashRow(ticker);
            this.updateAsset = { name: '', ticker: '', qty: null, avgPrice: null, type: 'Ação' };
            this.saveDataDebounced();
        },
        confirmDelete(ticker) {
            this.saveStateToHistory(`Exclusão do ativo ${ticker}`);
            this.portfolioAssets = this.portfolioAssets.filter(a => a.ticker !== ticker);
            this.saveDataDebounced();
        },
        addIrRow(type) {
            this.saveStateToHistory(`Adicionar linha na tabela de IR: ${type}`);
            const newRows = {
                saldos: { tipoConta: '', instituicao: '', saldoUSD: '', cotacao: '', saldoBRL: '', obs: '' },
                aportes: { data: '', tipo: '', valorBRL: '', cotacao: '', valorUSD: '', instituicao: '', obs: '' },
                comprasVendas: { data: '', tipo: '', ticker: '', ativo: '', qtd: '', preco: '', total: '', corretora: '', obs: '' },
                proventos: { data: '', ticker: '', ativo: '', tipo: '', bruto: '', imposto: '', liquido: '', obs: '' },
                remessas: { data: '', valorBRL: '', cotacao: '', valorUSD: '', destino: '', obs: '' },
            };
            this.irData[type].push(newRows[type]);
            this.saveDataDebounced();
        },
        deleteIrRow(type, index) {
            this.saveStateToHistory(`Excluir linha da tabela de IR: ${type}`);
            this.irData[type].splice(index, 1);
            this.saveDataDebounced();
        },
        getVariationPercent(current, avg) {
            if (!avg || avg === 0) return '0.00';
            return (((current / avg) - 1) * 100).toFixed(2);
        },
        getAssetYield(asset) {
            const unrealizedProfit = (asset.currentPrice - asset.avgPrice) * asset.qty;
            const realizedProfit = asset.realizedProfit || 0;
            return unrealizedProfit + realizedProfit;
        },
        getIcon(variation, isPlTab = false) {
            const v = parseFloat(variation);
            const upIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            const neutralIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            if (isPlTab && Math.abs(v) < this.plNeutralRange) return neutralIcon;
            if (v > 0) return upIcon;
            if (v < 0) return downIcon;
            return neutralIcon;
        },
        getSummaryCardIcon(variation) {
            const v = parseFloat(variation);
            if (v > 0.01) return `<div class="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></div>`;
            if (v < -0.01) return `<div class="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>`;
            return `<div class="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg></div>`;
        },
        getSummaryPlColorClass(value) {
            const v = parseFloat(value);
            if (v > 0.01) return 'text-brand-green';
            if (v < -0.01) return 'text-brand-orange';
            return 'text-brand-blue';
        },
        getPlColorClass(value) {
            const v = parseFloat(value);
            if (this.portfolioSubTab === 'profit-loss' && Math.abs(v) < this.plNeutralRange) return 'text-brand-blue';
            if (v > 0) return 'text-brand-green';
            if (v < 0) return 'text-brand-orange';
            return 'text-text-primary';
        },
        calculateNextDividend(asset) {
            if (!asset.dividendYield || asset.dividendYield <= 0) return 0;
            const totalValue = asset.qty * asset.currentPrice;
            const annualDividend = totalValue * (asset.dividendYield / 100);
            const divisors = { mensal: 12, trimestral: 4, semestral: 2, anual: 1, na: Infinity };
            return (annualDividend / (divisors[asset.dividendFrequency] || 1));
        },
        exportIrToCsv() {
            const headers = {
                saldos: ['Tipo de Conta', 'Instituição', 'Saldo (USD)', 'Cotação USD', 'Saldo (BRL)', 'Observações'],
                aportes: ['Data', 'Tipo', 'Valor (BRL)', 'Cotação USD', 'Valor (USD)', 'Instituição', 'Observações'],
                comprasVendas: ['Data', 'Tipo', 'Ticker', 'Ativo', 'Qtd', 'Preço/Unid.', 'Total USD', 'Corretora', 'Obs.'],
                proventos: ['Data', 'Ticker', 'Ativo', 'Tipo Provento', 'Valor Bruto', 'Imposto Retido', 'Valor Líquido', 'Observações'],
                remessas: ['Data', 'Valor (BRL)', 'Cotação USD', 'Valor (USD)', 'Destino', 'Observações']
            };
            const data = this.irData[this.irTab];
            if (data.length === 0) { this.showAppToast('Não há dados para exportar.'); return; }
            const csvContent = [headers[this.irTab].join(','), ...data.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
            const link = document.createElement("a");
            link.setAttribute("href", URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })));
            link.setAttribute("download", `IR_${this.irTab}_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        },
        async analyzePortfolio() {
            this.isLoadingAnalysis = true; this.isModalOpen = true; this.analysisResult = '';
            const portfolioData = this.portfolioAssets.map(asset => ({ ticker: asset.ticker, quantidade: asset.qty, preco_medio: asset.avgPrice.toFixed(2), preco_atual: asset.currentPrice.toFixed(2), variacao_percentual: this.getVariationPercent(asset.currentPrice, asset.avgPrice) }));
            const prompt = `Análise de Carteira de Investimentos: Com base nos dados da carteira abaixo, forneça uma análise e sugestões de rebalanceamento. Seja objetivo e direto. Foque em ações práticas que o investidor pode tomar. Se um ativo subiu muito, sugira uma realização de lucro parcial. Se caiu muito, analise se é uma oportunidade ou um risco. Formate a resposta em markdown simples. Dados da Carteira: ${JSON.stringify(portfolioData, null, 2)}`;
            try {
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
                const result = await response.json();
                this.analysisResult = (result.candidates && result.candidates[0].content.parts.length > 0) ? result.candidates[0].content.parts[0].text : "Não foi possível obter uma análise.";
            } catch (error) {
                this.analysisResult = "Ocorreu um erro ao tentar analisar a carteira.";
            } finally {
                this.isLoadingAnalysis = false;
            }
        },
        runProjectionCalculations() {
            if (this.projections.usePortfolioData) this.projections.valorAtualBRL = this.totalPortfolioValueUSD * this.userSettings.exchangeRate;
            const { valorInicialBRL, valorAtualBRL, mesesDecorridos, selectedGoal, aporteMensalBRL } = this.projections;
            const { exchangeRate } = this.userSettings;
            if (!valorInicialBRL || !valorAtualBRL || !mesesDecorridos || !selectedGoal || !exchangeRate) { this.projections.results = null; return; }
            this.projections.results = this.calculateProgress({ valorInicialBRL: parseFloat(valorInicialBRL), valorAtualBRL: parseFloat(valorAtualBRL), mesesDecorridos: parseInt(mesesDecorridos), metaBRL: parseFloat(selectedGoal), cotacaoUSD: parseFloat(exchangeRate), aporteMensalBRL: parseFloat(aporteMensalBRL) || 0 });
        },
        calculateProgress({ valorInicialBRL, valorAtualBRL, mesesDecorridos, metaBRL, cotacaoUSD, aporteMensalBRL }) {
            const rendimento = (vi, va) => vi === 0 ? 0 : (va / vi) - 1;
            const taxaMediaMensal = (rt, m) => m === 0 ? 0 : Math.pow(1 + rt, 1 / m) - 1;
            const tempoParaMeta = (va, m, t, a = 0) => {
                if (m <= va) return -1;
                if (t <= 0) return a <= 0 ? Infinity : (m - va) / a;
                const num = Math.log((m * t + a) / (va * t + a));
                const den = Math.log(1 + t);
                const meses = num / den;
                return isNaN(meses) || meses < 0 ? Infinity : meses;
            };
            const rendimentoBRL = rendimento(valorInicialBRL, valorAtualBRL);
            const taxaBRL = taxaMediaMensal(rendimentoBRL, mesesDecorridos);
            const mesesBRL = tempoParaMeta(valorAtualBRL, metaBRL, taxaBRL, aporteMensalBRL);
            const rendimentoUSD = rendimento(valorInicialBRL / cotacaoUSD, valorAtualBRL / cotacaoUSD);
            const taxaUSD = taxaMediaMensal(rendimentoUSD, mesesDecorridos);
            const mesesUSD = tempoParaMeta(valorAtualBRL / cotacaoUSD, metaBRL / cotacaoUSD, taxaUSD, aporteMensalBRL / cotacaoUSD);
            return {
                reais: { rendimentoAcumulado: rendimentoBRL, taxaMediaMensal: taxaBRL, mesesParaMeta: mesesBRL },
                dolares: { rendimentoAcumulado: rendimentoUSD, taxaMediaMensal: taxaUSD, mesesParaMeta: mesesUSD }
            };
        },
        formatProjectionTime(totalMonths) {
            if (!isFinite(totalMonths)) return "Inatingível";
            if (totalMonths < 0) return "Meta já atingida";
            const y = Math.floor(totalMonths / 12); const m = Math.round(totalMonths % 12);
            let r = ''; if (y > 0) r += `${y} ano${y > 1 ? 's' : ''}`;
            if (m > 0) { if (y > 0) r += ' e '; r += `${m} ${m > 1 ? 'meses' : 'mês'}`; }
            return r || "Menos de um mês";
        },
        setupAutoRefresh() {
            if (this.autoRefreshIntervalId) clearInterval(this.autoRefreshIntervalId);
            const interval = parseInt(this.userSettings.autoRefreshInterval);
            if (!isNaN(interval) && interval > 0) {
                this.autoRefreshIntervalId = setInterval(() => this.fetchAllAssetPrices(), interval * 60 * 1000);
            }
        },
         manualRefresh() {
            if (this.mainTab === 'config') {
                this.showAppToast('Atualizando índices de mercado...');
                this.fetchMarketData();
                this.fetchDvolIndex(); // <-- CHAMADA AQUI para DVOL
            } else {
                this.showAppToast('Atualizando cotações...');
                this.fetchAllAssetPrices();
                this.fetchMarketData();
                this.fetchDvolIndex();
            }
        },
        async fetchAllAssetPrices() {
            if (this.isUpdatingPrices) return; this.isUpdatingPrices = true;
            const tickers = this.allAssets.map(a => a.typeAsset === 'crypto' ? `${a.ticker}USD` : a.ticker).join(',');
            if (tickers.length === 0) { this.isUpdatingPrices = false; return; }
            try {
                const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${this.fmpApiKey}`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    data.forEach(q => {
                        const ticker = q.symbol.endsWith('USD') ? q.symbol.slice(0, -3) : q.symbol;
                        const stockAsset = this.portfolioAssets.find(a => a.ticker === ticker);
                        if (stockAsset) { stockAsset.currentPrice = q.price; stockAsset.dailyChangePercent = q.changesPercentage; }
                        const cryptoAsset = this.cryptoAssets.find(c => c.ticker === ticker);
                        if (cryptoAsset) { cryptoAsset.coinPrice = q.price; cryptoAsset.dailyChangePercent = q.changesPercentage; }
                    });
                }
            } catch (error) { console.error(`Erro ao buscar dados da FMP:`, error); }
            this.lastUpdated = new Date().toLocaleString('pt-BR');
            this.isUpdatingPrices = false;
            this.showAppToast('Cotações atualizadas!');
            this.checkAssetAlerts();
            this.saveDataDebounced();
        },
        async fetchAssetDetails(ticker) {
            try {
                const [quoteRes, metricsRes, profileRes] = await Promise.all([
                    fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${this.fmpApiKey}`),
                    fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${this.fmpApiKey}`),
                    fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${this.fmpApiKey}`)
                ]);
                const quote = (await quoteRes.json())[0]; 
                const metrics = (await metricsRes.json())[0]; 
                const profile = (await profileRes.json())[0];
                const details = { price: null, name: '', dividendYield: null, type: 'Ação' };
                if (quote) { details.price = quote.price; details.name = quote.name; }
                if (metrics) details.dividendYield = (metrics.dividendYieldTTM || 0) * 100;
                if (profile) {
                    if (profile.companyName) details.name = profile.companyName;
                    if (profile.isEtf) details.type = 'ETF';
                    else if (profile.isReit) details.type = 'REIT';
                }
                return details;
            } catch (error) { return { price: null, name: '', dividendYield: null, type: 'Ação' }; }
        },
        async fetchAndFillInfo(targetKey) {
            let ticker = (targetKey === 'crypto') ? this.newCryptoTx.coin : this[targetKey].ticker.toUpperCase();
            if (!ticker) return; this.isFetchingInfo[targetKey] = true;
            if (targetKey === 'crypto') {
                const url = `https://financialmodelingprep.com/api/v3/quote/${ticker}USD?apikey=${this.fmpApiKey}`;
                try {
                    const data = (await (await fetch(url)).json())[0];
                    if (data) { this.newCryptoTx.coinPrice = data.price; this.showAppToast(`Preço do ${data.name} atualizado!`); }
                } catch (e) { this.showAppToast('Erro ao buscar dados da cripto.'); }
            } else {
                const details = await this.fetchAssetDetails(ticker);
                if (details.name) {
                    this[targetKey].name = details.name; if (details.type) this[targetKey].type = details.type;
                    if (targetKey === 'newTx') this[targetKey].price = details.price;
                    else if (targetKey === 'updateAsset') this[targetKey].avgPrice = details.price;
                    this.showAppToast(`Dados de ${details.name} preenchidos!`);
                }
            }
            this.isFetchingInfo[targetKey] = false;
        },
        showInfoPopup(title, content) {
            this.infoPopup.title = title;
            this.infoPopup.content = content;
            this.infoPopup.show = true;
        },

        openAlertModal() {
            const firstTicker = this.portfolioAssets.length > 0 ? this.portfolioAssets[0].ticker : '';
            this.alertConfig.ticker = firstTicker;
            this.isAlertModalOpen = true;
            this.loadAlertSettingsForTicker();
        },
        loadAlertSettingsForTicker() {
            const ticker = this.alertConfig.ticker;
            const savedAlert = this.assetAlerts[ticker];
            if (savedAlert) {
                this.alertConfig.valorizarPercent = savedAlert.valorizarPercent;
                this.alertConfig.desvalorizarPercent = savedAlert.desvalorizarPercent;
                this.alertConfig.period = savedAlert.period || 'mes';
            } else {
                this.alertConfig.valorizarPercent = null;
                this.alertConfig.desvalorizarPercent = null;
            }
        },
        saveIndividualAlert(type) {
            const { ticker, period } = this.alertConfig;
            if (!ticker) {
                this.showAppToast('Por favor, selecione um ativo primeiro.');
                return;
            }
            const value = (type === 'valorizar') ? this.alertConfig.valorizarPercent : this.alertConfig.desvalorizarPercent;
            if (value === null || value === '' || isNaN(value)) {
                this.showAppToast(`O campo de ${type} está vazio.`);
                return;
            }
            if (!this.assetAlerts[ticker]) {
                this.assetAlerts[ticker] = {
                    valorizarPercent: null,
                    desvalorizarPercent: null,
                    period: 'mes',
                    active: true,
                    triggeredUp: false,
                    triggeredDown: false,
                };
            }
            if (type === 'valorizar') {
                this.assetAlerts[ticker].valorizarPercent = value;
            } else {
                this.assetAlerts[ticker].desvalorizarPercent = value;
            }
            this.assetAlerts[ticker].period = period;
            this.saveDataDebounced();
            this.showAppToast(`Alerta de ${type} salvo para ${ticker} em ${value}%.`);
        },
        isAlertTriggered(asset) {
            const alert = this.assetAlerts[asset.ticker];
            return alert && (alert.triggeredUp || alert.triggeredDown);
        },
        resetAssetAlert(ticker, direction) {
            const alert = this.assetAlerts[ticker];
            if (alert) {
                this.saveStateToHistory(`Reset do alerta de ${direction} de ${ticker}`);
                if (direction === 'up') alert.triggeredUp = false;
                if (direction === 'down') alert.triggeredDown = false;
                this.saveDataDebounced();
                this.showAppToast(`Gatilho de ${direction === 'up' ? 'valorização' : 'desvalorização'} resetado para ${ticker}.`);
            }
        },
        checkAssetAlerts() {
            Object.keys(this.assetAlerts).forEach(ticker => {
                const alert = this.assetAlerts[ticker];
                const asset = this.portfolioAssets.find(a => a.ticker === ticker);
                if (!asset || !alert || !alert.active) return;
                const percentChange = parseFloat(this.getVariationPercent(asset.currentPrice, asset.avgPrice));
                if (alert.valorizarPercent && !alert.triggeredUp && percentChange >= alert.valorizarPercent) {
                    alert.triggeredUp = true;
                    this.showAppToast(`ALERTA: ${ticker} VALORIZOU ${alert.valorizarPercent}%!`);
                    this.saveDataDebounced();
                }
                if (alert.desvalorizarPercent && !alert.triggeredDown && percentChange <= -alert.desvalorizarPercent) {
                    alert.triggeredDown = true;
                    this.showAppToast(`ALERTA: ${ticker} DESVALORIZOU ${alert.desvalorizarPercent}%!`);
                    this.saveDataDebounced();
                }
            });
        },
        getAlertIconStatus(asset) {
            const alert = this.assetAlerts[asset.ticker];
            const variation = parseFloat(this.getVariationPercent(asset.currentPrice, asset.avgPrice));
            if (alert) {
                if (alert.triggeredUp && variation >= alert.valorizarPercent) return 'text-brand-green animate-pulse cursor-pointer';
                if (alert.triggeredDown && variation <= -alert.valorizarPercent) return 'text-brand-orange animate-pulse cursor-pointer';
            }
            return '';
        },
        onClickAssetAlertIcon(ticker) {
            const alert = this.assetAlerts[ticker];
            const asset = this.portfolioAssets.find(a => a.ticker === ticker);
            if (!alert || !asset) return;
            const variation = parseFloat(this.getVariationPercent(asset.currentPrice, asset.avgPrice));
            if (alert.triggeredUp && variation >= alert.valorizarPercent) {
                this.resetAssetAlert(ticker, 'up');
            }
            if (alert.triggeredDown && variation <= -alert.desvalorizarPercent) {
                this.resetAssetAlert(ticker, 'down');
            }
        }
    }
}