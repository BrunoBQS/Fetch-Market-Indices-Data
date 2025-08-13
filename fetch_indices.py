import yfinance as yf
import json


# ALTERAÇÃO 1: Adicionamos o DVOL diretamente na lista principal.
# O ticker dele no Yahoo Finance é 'BTC-DVOL.DB'
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
    data = yf.Tickers(list(tickers_map.values()))
    
    # Este loop agora busca TODOS os índices, incluindo o DVOL
    for key, yahoo_ticker in tickers_map.items():
        # Usamos .download() para mais robustez em vez de .info
        hist = data.tickers[yahoo_ticker].history(period="5d")
        
        if not hist.empty:
            # Pega o último preço disponível e o fechamento anterior
            price = hist['Close'].iloc[-1]
            previous_close = hist['Close'].iloc[-2] if len(hist['Close']) > 1 else price
            
            if price > 0 and previous_close > 0:
                change_percent = ((price / previous_close) - 1) * 100
            else:
                change_percent = 0

            output_data[key] = {
                'price': round(price, 2),
                'change': round(change_percent, 2)
            }
            print(f"  - {key}: Preço={price:.2f}, Variação={change_percent:.2f}%")
        else:
            print(f"  - {key}: Não foi possível obter dados.")
            output_data[key] = {'price': 0, 'change': 0}

except Exception as e:
    print(f"Ocorreu um erro geral ao buscar dados do Yahoo Finance: {e}")
    # Garante que todos os tickers tenham uma entrada, mesmo em caso de erro
    for key in tickers_map.keys():
        if key not in output_data:
            output_data[key] = {'price': 0, 'change': 0}

# ALTERAÇÃO 2: REMOVEMOS completamente o bloco de código que tentava acessar a API da Deribit.
# Agora tudo é feito de uma só vez pelo yfinance.

# Escreve o resultado no arquivo JSON
with open('indices.json', 'w') as f:
    json.dump(output_data, f, indent=4)

print("\nArquivo 'indices.json' gerado com sucesso!")
print(json.dumps(output_data, indent=2))