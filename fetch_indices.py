import yfinance as yf
import requests
import json

# Mapeia os tickers que queremos para os tickers do Yahoo Finance
tickers_map = {
    'SPX': '^GSPC',
    'DJI': '^DJI',
    'IXIC': '^IXIC',
    'RUT': '^RUT',
    'VIX': '^VIX'
}

output_data = {}

# Busca os índices de mercado via Yahoo Finance
try:
    print("Buscando dados do Yahoo Finance...")
    data = yf.Tickers(list(tickers_map.values()))
    
    for key, yahoo_ticker in tickers_map.items():
        info = data.tickers[yahoo_ticker].info
        price = info.get('regularMarketPrice', 0)
        previous_close = info.get('previousClose', 0)
        
        if price > 0 and previous_close > 0:
            change_percent = ((price / previous_close) - 1) * 100
        else:
            change_percent = 0

        output_data[key] = {
            'price': round(price, 2),
            'change': round(change_percent, 2)
        }
        print(f"  - {key}: Preço={price}, Variação={change_percent:.2f}%")

except Exception as e:
    print(f"Erro ao buscar dados do Yahoo Finance: {e}")

# Busca o DVOL Index via Deribit
try:
    print("Buscando dados do DVOL na Deribit...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # ALTERAÇÃO 1: URL correta usando o endpoint /ticker e o instrument_name=BTC-DVOL
    url = "https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-DVOL"
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    deribit_data = response.json()
    
    # ALTERAÇÃO 2: Lógica correta para ler a resposta do endpoint /ticker
    if 'result' in deribit_data and 'last_price' in deribit_data['result']:
        dvol_price = deribit_data['result']['last_price']
        output_data['DVOL'] = {
            'price': round(dvol_price, 2),
            'change': 0  # Este endpoint também não fornece a variação diária
        }
        print(f"  - DVOL: Preço={dvol_price}")
    else:
        output_data['DVOL'] = {'price': 0, 'change': 0}
        print("  - DVOL: Chave 'last_price' não encontrada na resposta. Resposta da API:")
        print(deribit_data)

except Exception as e:
    print(f"Erro ao buscar dados da Deribit: {e}")
    if 'DVOL' not in output_data:
        output_data['DVOL'] = {'price': 0, 'change': 0}


# Escreve o resultado no arquivo JSON
with open('indices.json', 'w') as f:
    json.dump(output_data, f, indent=4)

print("\nArquivo 'indices.json' gerado com sucesso!")
print(json.dumps(output_data, indent=2))