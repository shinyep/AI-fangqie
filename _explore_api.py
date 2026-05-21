import urllib.request, ssl, json
ctx = ssl.create_default_context()
h = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}

api_base = 'https://c.xingyuexiezuo.com/api'
endpoints = ['', '/', '/books', '/workflow', '/scan', '/rank', '/ranking', '/hot', '/trend', '/book/rank', '/book/hot', '/book/scan', '/book/list', '/book/search', '/popular', '/analysis', '/list']

for ep in endpoints:
    try:
        url = api_base + ep
        req = urllib.request.Request(url, headers=h)
        resp = urllib.request.urlopen(req, context=ctx, timeout=10)
        data = resp.read().decode('utf-8', errors='replace')
        print(f'{ep} ({resp.status}): {data[:300]}')
    except Exception as e:
        err = str(e)[:100]
        print(f'{ep}: {err}')
