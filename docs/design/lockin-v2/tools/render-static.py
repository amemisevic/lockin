import re, json, sys, os
from playwright.sync_api import sync_playwright
boards=json.load(open('canvas.json'))['boards']
JS=r"""
({script})=>{
 class DCLogic{constructor(p){this.props=p||{};this.state={}}setState(o){Object.assign(this.state,o)}}
 const C=new Function('DCLogic',script+';return Component;')(DCLogic);
 const inst=new C({}); const vals=inst.renderVals();
 const ev=(expr,scope)=>{try{return new Function('s','with(s){return ('+expr+')}')(scope)}catch(e){return undefined}};
 const sub=(str,scope)=>str.replace(/\{\{\s*([^}]+?)\s*\}\}/g,(m,e)=>{const v=ev(e,scope);return typeof v==='function'||v===undefined||v===null?'':String(v)});
 const walk=(node,scope)=>{
  for(const ch of Array.from(node.childNodes)){
   if(ch.nodeType===3){ch.textContent=sub(ch.textContent,scope);continue}
   if(ch.nodeType!==1)continue;
   const tag=ch.tagName.toLowerCase();
   if(tag==='sc-for'){
    const list=ev(ch.getAttribute('list').replace(/^\{\{|\}\}$/g,''),scope)||[];const as=ch.getAttribute('as');
    const frag=document.createDocumentFragment();
    list.forEach((it,i)=>{const sc=Object.assign({},scope);sc[as]=it;sc['index']=i;const wrap=document.createElement('div');wrap.innerHTML=ch.innerHTML;walk(wrap,sc);while(wrap.firstChild)frag.appendChild(wrap.firstChild)});
    ch.replaceWith(frag);continue}
   if(tag==='sc-if'){
    const v=ev(ch.getAttribute('value').replace(/^\{\{|\}\}$/g,''),scope);
    if(v&&v!=='false'){walk(ch,scope);const f=document.createDocumentFragment();while(ch.firstChild)f.appendChild(ch.firstChild);ch.replaceWith(f)}else ch.remove();continue}
   for(const a of Array.from(ch.attributes)){
    if(a.name.startsWith('hint-')){ch.removeAttribute(a.name);continue}
    if(a.value.includes('{{')){const v=sub(a.value,scope);if(/^on/i.test(a.name)&&v==='')ch.removeAttribute(a.name);else ch.setAttribute(a.name,v)}}
   walk(ch,scope)}
 };
 walk(document.querySelector('x-dc'),vals);
 return document.documentElement.outerHTML;
}
"""
os.makedirs('static',exist_ok=True); os.makedirs('reference',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for name,m in boards.items():
        src=open(name).read()
        script=re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>',src,re.S).group(1)
        html=re.sub(r'<script type="text/x-dc".*?</script>','',src,flags=re.S)
        html=re.sub(r'<script src="./support.js"></script>','',html)
        html=re.sub(r'<helmet>(.*?)</helmet>',lambda mm:'',html,flags=re.S) if False else html
        head=re.search(r'<helmet>(.*?)</helmet>',html,re.S).group(1)
        html=re.sub(r'<helmet>.*?</helmet>','',html,flags=re.S).replace('</head>',head+'<style>x-dc{display:block}</style></head>')
        pg=b.new_page(viewport={'width':m['w'],'height':m['h']},device_scale_factor=2)
        pg.set_content(html); pg.wait_for_timeout(1800)
        out=pg.evaluate(JS,{'script':script})
        out=re.sub(r'<script.*?</script>','',out,flags=re.S)
        out=re.sub(r'<link[^>]*fonts.googleapis[^>]*>','<link rel="stylesheet" href="../assets/fonts/fonts.css">',out)
        open('static/'+name.replace('.dc.html','.html'),'w').write('<!doctype html>\n'+out)
        pg.goto('file://'+os.getcwd()+'/static/'+name.replace('.dc.html','.html')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(800)
        pg.wait_for_timeout(300)
        pg.screenshot(path='reference/'+name.replace('.dc.html','.png'),full_page=True)
        print(name,m['w'],m['h'],pg.evaluate('document.documentElement.scrollHeight'))
        pg.close()
    b.close()
