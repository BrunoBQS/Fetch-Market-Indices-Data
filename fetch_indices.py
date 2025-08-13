import yfinance as yf
import json

# ALTERAÇÃO: Removemos o DVOL e adicionamos Bitcoin (BTC-USD)
tickers_map = {
    'SPX': '^GSPC',
    'DJI': '^DJI',
    'IXIC': '^IXIC',
    'RUT': '^RUT',
    'VIX': '^VIX',
    'BTC': 'BTC-USD',
}

output_data = {}

try:
    print("Buscando todos os dados via Yahoo Finance...")
    data = yf.Tickers(list(tickers_map.values()))
    
    for key, yahoo_ticker in tickers_map.items():
        hist = data.tickers[yahoo_ticker].history(period="5d")
        
        if not hist.empty:
            price = hist['Close'].iloc[-1]
            previous_close = hist['Close'].iloc[-2] if len(hist) > 1 else price
            change_percent = ((price / previous_close) - 1) * 100 if previous_close > 0 else 0
            
            output_data[key] = {
                'price': round(price, 2),
                'change': round(change_percent, 2)
            }
            print(f"  - SUCESSO: {key} | Preço={price:.2f}")
        else:
            print(f"  - FALHA: Não foi possível obter dados para {key} ({yahoo_ticker}).")
            output_data[key] = {'price': 0, 'change': 0}

except Exception as e:
    print(f"Ocorreu um erro geral ao buscar dados do Yahoo Finance: {e}")
    for key in tickers_map.keys():
        if key not in output_data:
            output_data[key] = {'price': 0, 'change': 0}

with open('indices.json', 'w') as f:
    json.dump(output_data, f, indent=4)

print("\nArquivo 'indices.json' gerado com sucesso!")
print(json.dumps(output_data, indent=2))