import json, urllib.request, concurrent.futures, pathlib
from PIL import ImageFile
pubs=json.loads(pathlib.Path('audit/search-2026-10-04/full-pass/content-before.json').read_text(encoding='utf-8-sig'))
urls=set()
def walk(node):
 if not isinstance(node,dict): return
 if node.get('type') in ('image','figure') and node.get('attrs',{}).get('src'):urls.add(node['attrs']['src'])
 for child in node.get('content',[]):walk(child)
for pub in pubs:walk(pub.get('content_json'))
def dimensions(url):
 try:
  parser=ImageFile.Parser()
  request=urllib.request.Request(url,headers={'User-Agent':'Esnad image dimensions audit'})
  with urllib.request.urlopen(request,timeout=25) as response:
   for i in range(256):
    data=response.read(8192)
    if not data:break
    parser.feed(data)
    if parser.image:return url,{'width':parser.image.width,'height':parser.image.height}
  return url,{'error':'Image dimensions unavailable'}
 except Exception as e:return url,{'error':str(e)}
results=dict(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(dimensions,sorted(urls)))
pathlib.Path('audit/search-2026-10-04/full-pass/article-image-dimensions.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
good={url:data for url,data in results.items() if 'width' in data}
pathlib.Path('src/lib/articleImageDimensions.js').write_text('// Intrinsic dimensions of published article images. No editorial content is modified.\nexport const ARTICLE_IMAGE_DIMENSIONS = '+json.dumps(good,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
pathlib.Path('src/lib/articleImageDimensions.d.ts').write_text('export const ARTICLE_IMAGE_DIMENSIONS: Record<string, {width: number; height: number}>\n',encoding='utf-8')
print(json.dumps({'images':len(results),'resolved':len(good),'failures':{k:v for k,v in results.items() if 'error' in v}}))
