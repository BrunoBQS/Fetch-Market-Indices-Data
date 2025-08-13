import yfinance as yf
import json

# Mapeia todos os tickers, incluindo o DVOL do Yahoo Finance
# Esta é a fonte de dados mais estável e gratuita que temos.
tickers_map = {
    'SPX': '^GSPC',
    'DJI': '^DJI',
    'IXIC': '^IXIC',
    'RUT': '^RUT',
    'VIX': '^VIX',
    'DVOL': 'BTC-DVOL.DB'
}

output_data = {}

try:
    print("Buscando todos os dados via Yahoo Finance...")
    # Faz uma única chamada para todos os tickers para ser mais eficiente
    data = yf.Tickers(list(tickers_map.values()))
    
    # Itera sobre cada ticker para processar os dados individualmente
    for key, yahoo_ticker in tickers_map.items():
        # Pega o histórico dos últimos 5 dias para garantir que tenhamos dados
        hist = data.tickers[yahoo_ticker].history(period="5d")
        
        # Verifica se o histórico não está vazio (às vezes, um ticker pode falhar)
        if not hist.empty:
            # Pega o último preço disponível (o mais recente)
            price = hist['Close'].iloc[-1]
            # Pega o fechamento do dia anterior para calcular a mudança
            previous_close = hist['Close'].iloc[-2] if len(hist) > 1 else price
            
            change_percent = ((price / previous_close) - 1) * 100 if previous_close > 0 else 0
            
            output_data[key] = {
                'price': round(price, 2),
                'change': round(change_percent, 2)
            }
            print(f"  - SUCESSO: {key} | Preço={price:.2f}")
        else:
            # Se, por algum motivo, um ticker específico falhar, ele será registrado aqui
            print(f"  - FALHA: Não foi possível obter dados para {key} ({yahoo_ticker}).")
            output_data[key] = {'price': 0, 'change': 0}

except Exception as e:
    # Este erro acontece se a biblioteca yfinance falhar completamente
    print(f"Ocorreu um erro geral ao buscar dados do Yahoo Finance: {e}")
    # Garante que todos os tickers tenham uma entrada no JSON para não quebrar o app
    for key in tickers_map.keys():
        if key not in output_data:
            output_data[key] = {'price': 0, 'change': 0}

# Escreve o resultado final no arquivo JSON
with open('indices.json', 'w') as f:
    json.dump(output_data, f, indent=4)

print("\nArquivo 'indices.json' gerado com sucesso!")
print(json.dumps(output_data, indent=2))