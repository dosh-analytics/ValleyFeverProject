/* Valley Fever Heatmap: map, year-by-year view, Kern close-up and section menu.
   Data comes from data/*.js, loaded first. */
var RAST={R:'img/climate-2019-2023.png',H:'img/climate-2001-2023.png'};

var $=function(i){return document.getElementById(i)};
var VW=640,VH=731.1;
function fmtRate(v){return v===0?'0':v>=10?Math.round(v).toLocaleString('en-US'):v.toFixed(1)}
function nz(v){return (v===null||v===undefined)?'not shown':v.toLocaleString('en-US')}
var BINS=[[1,'#f6f4f0'],[5,'#fbd9c0'],[15,'#f7bd94'],[40,'#f29e68'],[90,'#eb6834'],[200,'#c94e1f'],[1e9,'#6b2609']];
function rateColor(v){for(var i=0;i<BINS.length;i++){if(v<BINS[i][0])return BINS[i][1]}return '#6b2609'}
var KWORK=[[6,'#eef3f9'],[10,'#cde2fb'],[15,'#9ec5f4'],[22,'#5598e7'],[1e9,'#1c5cab']];
function workColor(p){for(var i=0;i<KWORK.length;i++)if(p<KWORK[i][0])return KWORK[i][1]}
var SBASE='#efece6',STEAL=['#7fbdb7','#52a29b','#2a807a','#0f5652'],SBINS=[500,1500,3000,6000];
function sitesColor(v){if(v===null||v===undefined||v<SBINS[0])return SBASE;for(var i=1;i<SBINS.length;i++){if(v<SBINS[i])return STEAL[i-1]}return STEAL[3]}
var LEG={
 rate:[['#f6f4f0','under 1'],['#fbd9c0','1 to 5'],['#f7bd94','5 to 15'],['#f29e68','15 to 40'],['#eb6834','40 to 90'],['#c94e1f','90 to 200'],['#6b2609','200 or more']],
 model:[['#fbd9c0','lower match'],['#f29e68',''],['#c94e1f',''],['#6b2609','higher match']],
 work:[['#eef3f9','under 6%'],['#cde2fb','6 to 10%'],['#9ec5f4','10 to 15%'],['#5598e7','15 to 22%'],['#1c5cab','22% or more']],
 sites:[['#efece6','under 500'],['#7fbdb7','500 to 1,500'],['#52a29b','1,500 to 3,000'],['#2a807a','3,000 to 6,000'],['#0f5652','6,000 or more']]};
var LTITLE={rate:'Reported cases per 100,000 residents a year',model:'Climate match',work:'Share of workers in outdoor industries',sites:'People at soil-disturbing employer sites'};
var HINT={rate:'Rates let counties of very different size be compared. Cases are counted where people live.',
 model:'How closely the climate resembles places people already get sick. Not a soil test and not a measure of dust.',
 work:'Agriculture, construction, mining and oil and gas, from a sample survey. Each area holds about 100,000 people.',
 sites:'Counted where the employer is based, for sites with five or more employees, from a business directory.'};
var M={layer:'rate',period:'R',hi:false,sel:'Kern',psel:null,fk:null};
var YBT={MODELED:'#4f3fc0',OBSERVED:'#a8411a',WEATHER:'#1d5aa3'};
function fillFind(){var a=isArea(),k=a?'a':'c';if(M.fk===k)return;M.fk=k;var o=a?Object.keys(PD).map(function(i){return [i,PD[i].n]}):Object.keys(CD).map(function(n){return [n,n+' County']});
  o.sort(function(x,y){return x[1].localeCompare(y[1])});
  $('mFind').innerHTML='<option value="">'+(a?'Choose an area':'Choose a county')+'</option>'+o.map(function(p){return '<option value="'+p[0]+'">'+p[1].replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</option>'}).join('')}
function span(){return M.period==='R'?'2019 to 2023':'2001 to 2023'}
function cls(b){var c=Math.floor(b/3)===2,w=b%3===2;return c&&w?'both':c?'clim':w?'work':'none'}
function isArea(){return M.layer==='work'||M.layer==='sites'}
function buildHi(){
  var g=$('hiG'),h='';
  document.querySelectorAll('#pumas .pum').forEach(function(el){var k=el.getAttribute('data-i'),d=el.getAttribute('d');
    h+='<path class="halo" data-k="'+k+'" d="'+d+'"/><path class="ink" data-k="'+k+'" d="'+d+'"/>'});
  g.innerHTML=h}
function nBoth(){var n=0;for(var k in WP){if(cls(WP[k].t1['b'+M.period])==='both')n++}return n}
function paint(){
  var L=M.layer;
  if(isArea()&&!M.hi)M.period='R';   /* the period switch is hidden here, so show 2019 to 2023 */
  fillFind();
  ['Rate','Model','Work','Sites'].forEach(function(b){$('ly'+b).setAttribute('aria-pressed',L===b.toLowerCase()?'true':'false')});
  $('rLayer').style.display=L==='model'?'':'none';
  $('rLayer').setAttribute('href',RAST[M.period]);
  $('counties').style.display=isArea()?'none':'';
  $('pumas').style.display=isArea()?'':'none';
  document.querySelectorAll('#counties .cty').forEach(function(el){var n=el.getAttribute('data-n'),d=CD[n];if(!d)return;var r=M.period==='R'?d.rateR:d.rateH;
    if(L==='model'){el.setAttribute('fill-opacity','0')}else{el.setAttribute('fill-opacity','1');el.setAttribute('fill',rateColor(r))}
    el.setAttribute('aria-label',n+' County. '+(L==='model'?'Climate match '+d.cb+' than most of California. ':'')+fmtRate(r)+' reported cases per 100,000 residents a year, '+span()+'.')});
  document.querySelectorAll('#pumas .pum').forEach(function(el){var k=el.getAttribute('data-i'),d=PD[k],w=WP[k];
    el.setAttribute('fill',L==='work'?(d?workColor(d.pct):SBASE):sitesColor(w?w.t1.e:null))});
  $('hiG').style.display=M.hi?'':'none';
  if(M.hi)document.querySelectorAll('#hiG path').forEach(function(p){var w=WP[p.getAttribute('data-k')];p.style.display=(w&&cls(w.t1['b'+M.period])==='both')?'':'none'});
  $('perGroup').style.display=(L==='rate'||L==='model'||M.hi)?'':'none';
  $('perR').setAttribute('aria-pressed',M.period==='R');$('perH').setAttribute('aria-pressed',M.period==='H');
  var lg='<span class="lt">'+LTITLE[L]+(L==='rate'||L==='model'?', '+span():'')+'</span>'+LEG[L].map(function(p){return '<span><i style="background:'+p[0]+'"></i>'+p[1]+'</span>'}).join('');
  if(M.hi)lg+='<span style="width:100%"><i class="sw" style="background:#fff;border:2.3px solid #8b1e5f"></i>outlined: many soil-disturbing workers and a high climate match ('+nBoth()+' areas)'+(isArea()?'':'. Switch to Outdoor workers or Employer sites to see each outlined area\u2019s numbers')+'</span>';
  $('legendBox').innerHTML=lg;
  $('mapHint').textContent=HINT[L];
  if(isArea())showArea(M.psel);else showCounty(M.sel);
}
function links(county,area){var s='';
  if(county)s+='<a href="#years" data-yb="'+county+'">'+county+' year by year</a>';
  if(county==='Kern'||(area&&KC.lab[area]))s+=(s?' &middot; ':'')+'<a href="#kernclose" data-kc="'+(area&&KC.lab[area]?area:'192')+'">Kern close-up</a>';
  return s?'<p class="plink">'+s+'</p>':''}
function showCounty(n){
  var d=CD[n];if(!d)return;M.sel=n;
  document.querySelectorAll('#counties .cty').forEach(function(el){el.classList.toggle('sel',el.getAttribute('data-n')===n)});
  var rate=M.period==='R'?d.rateR:d.rateH,cases=M.period==='R'?d.casesR:d.casesH,h='<h3>'+n+' County</h3>';
  if(M.layer==='model'){
    h+='<div class="big" style="font-size:28px">'+d.cb.charAt(0).toUpperCase()+d.cb.slice(1)+'<small>climate match than most of California</small></div>';
    h+='<dl class="kv"><dt>Reported cases per 100,000 residents a year, '+span()+'</dt><dd>'+fmtRate(rate)+'</dd>';
  } else {
    h+='<div class="big">'+fmtRate(rate)+'<small>reported cases per 100,000 residents a year, '+span()+'</small></div>';
    h+='<dl class="kv">';
  }
  h+='<dt>Cases reported, '+span()+'</dt><dd>'+cases.toLocaleString('en-US')+'</dd>';
  h+='<dt>Residents</dt><dd>'+Math.round(d.pop).toLocaleString('en-US')+'</dd>';
  var w=WC[n];if(w)h+='<dt>People at soil-disturbing employer sites</dt><dd>'+nz(w.t1.e)+'</dd>';
  h+='</dl>';
  if(d.end)h+='<span class="tag">Named in Labor Code 6709, which requires Valley Fever awareness training for construction crews</span>';
  $('mPanel').innerHTML=h+links(n,null);$('mFind').value=n;
}
function showArea(k){
  document.querySelectorAll('#pumas .pum').forEach(function(el){el.classList.toggle('sel',el.getAttribute('data-i')===k)});
  if(k===null||!PD[k]){$('mPanel').innerHTML='<h3>'+(M.layer==='work'?'Outdoor workers':'Employer sites')+'</h3><p class="sub2">Point at or tap an area on the map.</p>'+
    '<dl class="kv">'+(M.layer==='work'?'<dt>Outdoor workers statewide</dt><dd>1,648,194</dd><dt>Agriculture and forestry</dt><dd>371,890</dd><dt>Construction</dt><dd>1,253,257</dd><dt>Mining, oil and gas</dt><dd>23,047</dd>'
    :'<dt>Soil-disturbing employer sites</dt><dd>'+WS.t1_s.toLocaleString('en-US')+'</dd><dt>People working there</dt><dd>'+WS.t1_e.toLocaleString('en-US')+'</dd><dt>&nbsp;&nbsp;in high-match climate</dt><dd>'+WS['t1_h'+M.period].toLocaleString('en-US')+'</dd>')+'</dl>';return}
  M.psel=k;var d=PD[k],w=WP[k]?WP[k].t1:null,h='<h3 style="font-size:16.5px">'+d.n+'</h3>';
  if(M.layer==='work'){
    h+='<div class="big">'+d.pct.toFixed(1)+'%<small>of workers who live here are in agriculture, construction, mining or oil and gas</small></div>';
    h+='<dl class="kv"><dt>Outdoor workers</dt><dd>'+d.out.toLocaleString('en-US')+'</dd><dt>All employed people</dt><dd>'+d.emp.toLocaleString('en-US')+'</dd></dl>';
  } else {
    var hv=w?w['h'+M.period]:null,sh=(w&&w.e&&hv!==null&&hv!==undefined)?Math.round(100*hv/w.e)+'%':null;
    h+='<div class="big">'+nz(w?w.e:null)+'<small>people work at '+nz(w?w.s:null)+' soil-disturbing employer sites based here</small></div>';
    h+='<dl class="kv"><dt>At sites in high-match climate, '+span()+'</dt><dd>'+(sh===null?'not shown':hv.toLocaleString('en-US')+' ('+sh+')')+'</dd>';
    h+='<dt>Climate rank where they work, '+span()+'</dt><dd>'+(w&&w['c'+M.period]!==null?Math.round(100*w['c'+M.period])+' of 100':'n/a')+'</dd>';
    h+='<dt>Outdoor workers living here (survey)</dt><dd>'+d.out.toLocaleString('en-US')+'</dd></dl>';
  }
  if(M.hi&&w)h+=cls(w['b'+M.period])==='both'?'<span class="tag both">High on both: many soil-disturbing workers and a high climate match</span>':'';
  $('mPanel').innerHTML=h+links(null,k);$('mFind').value=k;
}
function setLayer(l){M.layer=l;paint()}
function mapInit(){
  buildHi();
  document.querySelectorAll('#counties .cty').forEach(function(el){var n=el.getAttribute('data-n');
    ['mouseenter','focus','click'].forEach(function(ev){el.addEventListener(ev,function(){showCounty(n)})})});
  document.querySelectorAll('#pumas .pum').forEach(function(el){var k=el.getAttribute('data-i');
    ['mouseenter','focus','click'].forEach(function(ev){el.addEventListener(ev,function(){showArea(k)})})});
  $('lyRate').onclick=function(){setLayer('rate')};$('lyModel').onclick=function(){setLayer('model')};
  $('lyWork').onclick=function(){setLayer('work')};$('lySites').onclick=function(){setLayer('sites')};
  $('perR').onclick=function(){M.period='R';paint()};$('perH').onclick=function(){M.period='H';paint()};
  $('hiBoth').onchange=function(){M.hi=this.checked;paint()};
  $('mFind').onchange=function(){var v=this.value;if(!v)return;if(isArea())showArea(v);else showCounty(v)};
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#mPanel [data-yb],#mPanel [data-kc]'):null;if(!t)return;e.preventDefault();
    if(t.getAttribute('data-yb'))ybGo(t.getAttribute('data-yb'));
    else kcGo(t.getAttribute('data-kc'),{work:'work',sites:'sites',model:'clim',rate:'cases'}[M.layer])});
  paint();
}

/* ---------------- Year by year ---------------- */
var YBC={mod:'#6250d6',obs:'#eb6834',wx:'#2a78d6'};
var ybArea='California',ybYear=2023;
function ybR(v){return v===0?'0':fmtRate(v)}
function ybRho(r){return Math.abs(r)<0.005?'0.00':(r<0?'−':'+')+Math.abs(r).toFixed(2)}
function ybNm(a){return a==='California'?'California':a+' County'}
function ybNice(m){if(!(m>0))return 1;var p=Math.pow(10,Math.floor(Math.log(m)/Math.LN10)),f=m/p;
  return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function ybTick(v){return v>=10000?Math.round(v/1000)+'k':v>=1000?v.toLocaleString('en-US'):(v%1?v.toFixed(1):String(v))}
var YBG={};
function ybDraw(){
  var host=$('ybChart');if(!host)return;
  var W=Math.max(240,Math.round(host.clientWidth||640)),a=YB.areas[ybArea],Y=YB.years,n=Y.length,sel=Y.indexOf(ybYear);
  var nar=W<520,L=nar?34:46,R=nar?6:12,top=24,tH=nar?32:22,pH=nar?66:78,gap=14,H=top+4*(tH+pH+gap)+10;
  var bw=(W-L-R)/n,X=function(i){return L+(i+.5)*bw},s=[],yb=top-4,ye=top+4*(tH+pH+gap)-gap+4;
  YBG={W:W,L:L,bw:bw,n:n};
  var P=[{k:'model',t:'Model estimate (rank 0 to 100)',g:'MODELED',c:YBC.mod,ty:'line',mx:100},
         {k:'rate',t:'Reported cases per 100,000 residents',g:'OBSERVED',c:YBC.obs,ty:'line'},
         {k:'cases',t:'Reported cases (count)',g:'OBSERVED',c:YBC.obs,ty:'bar'},
         {k:'rain_in',t:'Winter rain, October to March (inches)',g:'WEATHER',c:YBC.wx,ty:'bar'}];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" style="font-family:inherit">');
  YB.droughts.forEach(function(d){var x0=X(d[0]-Y[0])-bw/2,x1=X(d[1]-Y[0])+bw/2;
    s.push('<rect x="'+x0.toFixed(1)+'" y="'+yb+'" width="'+(x1-x0).toFixed(1)+'" height="'+(ye-yb)+'" fill="#f1ebdd"/>');
    s.push('<text x="'+((x0+x1)/2).toFixed(1)+'" y="'+(yb-6)+'" text-anchor="middle" font-size="11" font-weight="650" fill="#6e5c2e">Drought</text>')});
  if(sel>=0)s.push('<rect x="'+(X(sel)-bw/2).toFixed(1)+'" y="'+yb+'" width="'+bw.toFixed(1)+'" height="'+(ye-yb)+'" fill="#25408f" fill-opacity=".1"/>');
  P.forEach(function(p,j){
    var y0=top+j*(tH+pH+gap),py0=y0+tH,py1=py0+pH,v=a[p.k],mx=p.mx||ybNice(Math.max.apply(null,v.concat([p.k==='rain_in'?a.rain_avg_in:0]))*1.04);
    var sy=function(x){return py1-(x/mx)*pH},zero=(p.k==='rate'||p.k==='cases')&&Math.max.apply(null,v)===0;
    s.push('<text x="'+L+'" y="'+(y0+13)+'" font-size="'+(nar?12:13)+'" font-weight="700" fill="#1a1a1a">'+p.t+'</text>');
    s.push('<text x="'+(nar?L:W-R)+'" y="'+(nar?y0+27:y0+13)+'" font-size="10.5" font-weight="750" letter-spacing=".06em" text-anchor="'+(nar?'start':'end')+'" fill="'+(YBT[p.g]||p.c)+'">'+p.g+'</text>');
    if(zero)s.push('<text x="'+((L+W-R)/2).toFixed(1)+'" y="'+(py1-pH/2+4).toFixed(1)+'" text-anchor="middle" font-size="12.5" fill="#5a5a5a">No cases reported in any year</text>');
    (zero?[0]:[0,mx/2,mx]).forEach(function(t){var yy=sy(t);
      s.push('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="'+(t?'#e4e2dc':'#9a9992')+'" stroke-width="1"/>');
      s.push('<text x="'+(L-6)+'" y="'+(yy+3.5).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="#5a5a5a">'+ybTick(t)+'</text>')});
    if(p.ty==='bar'){var w=Math.max(2,bw*.64);
      v.forEach(function(x,i){var h=Math.max(0,py1-sy(x));
        s.push('<rect x="'+(X(i)-w/2).toFixed(1)+'" y="'+(py1-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+p.c+'"'+(i===sel?' stroke="#1a1a1a" stroke-width="1.6"':'')+'/>')});
      if(p.k==='rain_in'){var ay=sy(a.rain_avg_in).toFixed(1);
        s.push('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ay+'" y2="'+ay+'" stroke="#1a1a1a" stroke-width="1.3" stroke-dasharray="4 3"/>')}
    } else {
      var d='';v.forEach(function(x,i){d+=(i?'L':'M')+X(i).toFixed(1)+' '+sy(x).toFixed(1)});
      s.push('<path d="'+d+'" fill="none" stroke="'+p.c+'" stroke-width="2.2" stroke-linejoin="round"/>');
      v.forEach(function(x,i){var hol=p.k==='rate'&&a.cases[i]>0&&a.cases[i]<20,on=i===sel,r=on?5:(nar?2.6:3.3);
        s.push('<circle cx="'+X(i).toFixed(1)+'" cy="'+sy(x).toFixed(1)+'" r="'+r+'" fill="'+(hol?'#fff':p.c)+'" stroke="'+(on?'#1a1a1a':p.c)+'" stroke-width="'+(on?1.7:1.5)+'"/>')});
    }
  });
  var step=Math.ceil(34/bw);
  Y.forEach(function(y,i){if(i%step&&i!==sel)return;if(i!==sel&&sel>=0&&Math.abs(i-sel)<step&&i%step)return;
    var on=i===sel;if(!on&&sel>=0&&Math.abs(i-sel)*bw<30)return;
    s.push('<text x="'+X(i).toFixed(1)+'" y="'+(H-4)+'" font-size="'+(on?11.5:10.5)+'" text-anchor="middle" fill="'+(on?'#1a1a1a':'#5a5a5a')+'" font-weight="'+(on?750:400)+'">'+y+'</text>')});
  s.push('</svg>');
  host.innerHTML=s.join('');
  host.setAttribute('aria-label',ybNm(ybArea)+', 2001 to 2023, four charts on one timeline, showing the model estimate, reported cases per 100,000 residents, reported cases as a count, and winter rain. The year menu and the table view give exact values.');
}
function ybIdx(e){var sv=$('ybChart').querySelector('svg');if(!sv)return -1;var r=sv.getBoundingClientRect();
  var x=(e.clientX-r.left)*(YBG.W/r.width),i=Math.floor((x-YBG.L)/YBG.bw);return Math.max(0,Math.min(YBG.n-1,i))}
function ybRow(icon,k,v,sub){return '<div class="ybv">'+icon+'<span class="k">'+k+'</span><b>'+v+'</b><span class="s">'+sub+'</span></div>'}
function ybIcon(c,bar){return bar?'<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><rect x="2" y="3" width="5" height="9" fill="'+c+'"/><rect x="10" y="0" width="5" height="12" fill="'+c+'"/></svg>'
  :'<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><line x1="1" y1="6" x2="19" y2="6" stroke="'+c+'" stroke-width="2.2"/><circle cx="10" cy="6" r="3.4" fill="'+c+'"/></svg>'}
function ybReadout(){
  var a=YB.areas[ybArea],i=YB.years.indexOf(ybYear),y=ybYear;
  var dr=YB.droughts.some(function(d){return y>=d[0]&&y<=d[1]});
  var h='<h3>'+ybNm(ybArea)+', '+y+'</h3><div class="ybtag'+(dr?'':' ghost')+'">Drought year, a period to examine</div>';
  h+='<div class="ybvs">';
  h+=ybRow(ybIcon(YBC.mod),'Model estimate (rank 0 to 100)',a.model[i],'Modeled. Climate, ranked among 1,334 county-years. Not a case count.');
  h+=ybRow(ybIcon(YBC.obs),'Reported cases per 100,000 residents',ybR(a.rate[i]),'Observed.'+(a.cases[i]>0&&a.cases[i]<20?' Fewer than 20 cases, so the rate swings a lot.':''));
  h+=ybRow(ybIcon(YBC.obs,1),'Reported cases (count)',a.cases[i].toLocaleString('en-US'),'Observed. '+a.pop[i].toLocaleString('en-US')+' residents.');
  h+=ybRow(ybIcon(YBC.wx,1),'Winter rain, Oct '+(y-1)+' to Mar '+y,a.rain_in[i].toFixed(1)+' in','Weather. '+a.rain_pct[i]+'% of the 2001 to 2023 average here.');
  $('ybRead').innerHTML=h+'</div>';
}
function ybChance(p){var n;if(p<0.001)return 'less than once in 1,000 tries';
  if(p<0.0095){n=Math.round(p*1000);return 'about '+n+(n===1?' time':' times')+' in 1,000'}
  if(p<0.095){n=Math.max(1,Math.round(p*100));return 'about '+n+(n===1?' time':' times')+' in 100'}
  n=Math.round(p*10);return 'about '+n+(n===1?' time':' times')+' in 10'}
function ybTable(){
  var a=YB.areas[ybArea],h='<table><caption class="sr" style="position:absolute;left:-9999px">'+ybNm(ybArea)+' year by year</caption><tr><th>Year</th><th class="n">Model estimate (rank 0 to 100)</th><th class="n">Reported cases per 100,000 residents</th><th class="n">Reported cases (count)</th><th class="n">Winter rain (inches)</th><th class="n">Percent of average</th><th>Drought</th></tr>';
  YB.years.forEach(function(y,i){var dr=YB.droughts.some(function(d){return y>=d[0]&&y<=d[1]});
    h+='<tr'+(y===ybYear?' class="on"':'')+'><td>'+y+'</td><td class="n">'+a.model[i]+'</td><td class="n">'+ybR(a.rate[i])+(a.cases[i]>0&&a.cases[i]<20?'*':'')+'</td><td class="n">'+a.cases[i].toLocaleString('en-US')+'</td><td class="n">'+a.rain_in[i].toFixed(1)+'</td><td class="n">'+a.rain_pct[i]+'%</td><td>'+(dr?'yes':'')+'</td></tr>'});
  $('ybTable').innerHTML=h+'</table><p class="hint">* Fewer than 20 cases.</p>';
}
function ybSync(full){$('ybYear').value=String(ybYear);$('ybArea').value=ybArea;ybDraw();ybReadout();if(full){ybFind()}ybTable()}
function ybGo(n){if(!YB.areas[n])return;ybArea=n;ybSync(1);$('years').scrollIntoView({behavior:'smooth',block:'start'})}
function ybInit(){
  var sa=$('ybArea');if(!sa)return;var names=Object.keys(YB.areas).filter(function(k){return k!=='California'}).sort();
  sa.innerHTML='<option value="California">California (statewide)</option>'+names.map(function(k){return '<option value="'+k+'">'+k+' County</option>'}).join('');
  $('ybYear').innerHTML=YB.years.map(function(y){return '<option>'+y+'</option>'}).join('');
  sa.onchange=function(){ybArea=sa.value;ybSync(1)};
  $('ybYear').onchange=function(){ybYear=+$('ybYear').value;ybSync()};
  var c=$('ybChart');
  c.addEventListener('mousemove',function(e){var i=ybIdx(e);if(i>=0&&YB.years[i]!==ybYear){ybYear=YB.years[i];ybSync()}});
  c.addEventListener('click',function(e){var i=ybIdx(e);if(i>=0){ybYear=YB.years[i];ybSync()}});
  var t=null;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(ybDraw,120)});
  ybSync(1);
}

/* ---------------- Kern close-up ---------------- */
var KC={ids:['192','26','45','213','114','267'],layer:'work',sel:'192',
  short:{'192':'West (Delano, Wasco, Shafter)','26':'East (Ridgecrest, Arvin, Tehachapi, California City)','45':'Bakersfield northeast','213':'Bakersfield northwest and Rosedale','114':'Bakersfield southeast','267':'Bakersfield southwest'},
  lab:{'192':'West','26':'East','45':'NE','213':'NW','114':'SE','267':'SW'}};
var KWORK=[[6,'#eef3f9'],[10,'#cde2fb'],[15,'#9ec5f4'],[22,'#5598e7'],[1e9,'#1c5cab']];
function kcN(v){return (v===null||v===undefined)?'n/a':v.toLocaleString('en-US')}
function kcFill(k){var d=PD[k],w=WP[k];
  if(KC.layer==='work'){for(var i=0;i<KWORK.length;i++)if(d.pct<KWORK[i][0])return KWORK[i][1]}
  if(KC.layer==='sites')return w?sitesColor(w.t1.e):SBASE;
  return 'transparent'}
function kcPaint(){
  var L=KC.layer,B={work:'Work',sites:'Sites',clim:'Clim',cases:'Cases'};$('kcR').style.display=L==='clim'?'':'none';
  $('kcCounty').setAttribute('fill',L==='cases'?rateColor(CD.Kern.rateR):'#efece6');
  KC.ids.forEach(function(k){$('kcp_'+k).setAttribute('fill',kcFill(k))});
  Object.keys(B).forEach(function(x){$('kc'+B[x]).setAttribute('aria-pressed',L===x?'true':'false')});
  var lg={work:LEG.work,sites:LEG.sites,clim:LEG.model,cases:[[rateColor(CD.Kern.rateR),'Kern County as a whole']]}[L];
  var t={work:'<span class="lt">Share of workers in outdoor industries, by area (survey)</span>',sites:'<span class="lt">People employed at soil-disturbing sites, by area (directory)</span>',clim:'<span class="lt">Climate match, 2019 to 2023</span>',cases:'<span class="lt">Reported illness</span>'}[L];
  $('kcLegend').className='legend';
  $('kcLegend').innerHTML=t+lg.map(function(p){return '<span><i style="background:'+p[0]+'"></i>'+p[1]+'</span>'}).join('');
  $('kcHint').textContent={work:'Where outdoor workers live, from a sample survey. Not where they work, and not illness.',
    sites:'Where employers in soil-disturbing industries are based, counted from a business directory. Crews often work elsewhere, and farm labor is undercounted.',
    clim:'How closely the climate resembles places people already get sick. Not a soil test and not a count of anything.',
    cases:'California publishes Valley Fever counts by county only, so the six areas cannot be told apart on this layer.'}[L];
  kcShow(KC.sel);
}
function kcSetLayer(l){KC.layer=l;kcPaint()}
function kcGo(k,l){if(l)KC.layer=l;kcPaint();if(k)kcShow(k);$('kernclose').scrollIntoView({behavior:'smooth',block:'start'})}
function kcBuild(){
  var svg=$('kcmap'),bb=CD.Kern.bb,p=3;if(!svg)return;
  svg.setAttribute('viewBox',(bb[0]-p).toFixed(1)+' '+(bb[1]-p).toFixed(1)+' '+(bb[2]-bb[0]+2*p).toFixed(1)+' '+(bb[3]-bb[1]+2*p).toFixed(1));
  var kd=$('c_Kern').getAttribute('d'),h='<defs><clipPath id="kcClip"><path d="'+kd+'"/></clipPath></defs>';
  h+='<path id="kcCounty" d="'+kd+'" fill="#efece6"/>';
  h+='<image id="kcR" href="'+RAST.R+'" x="0" y="0" width="'+VW+'" height="'+VH+'" preserveAspectRatio="none" clip-path="url(#kcClip)" style="display:none"/>';
  KC.ids.forEach(function(k){h+='<path class="kcp" id="kcp_'+k+'" data-k="'+k+'" d="'+$('p_'+k).getAttribute('d')+'" tabindex="0" role="button" aria-label="'+KC.short[k]+'"/>'});
  h+='<path d="'+kd+'" fill="none" stroke="#3d3d3d" stroke-width="1.3px" vector-effect="non-scaling-stroke" pointer-events="none"/><g id="kcLabels" pointer-events="none"></g>';
  svg.innerHTML=h;
  var g=$('kcLabels'),fs=((bb[2]-bb[0])/38).toFixed(2),fsS=((bb[2]-bb[0])/56).toFixed(2),lb='';
  KC.ids.forEach(function(k){var b=$('kcp_'+k).getBBox(),big=k==='192'||k==='26';
    lb+='<text class="lbl" x="'+(b.x+b.width/2).toFixed(1)+'" y="'+(b.y+b.height/2+(big?1:.8)).toFixed(1)+'" text-anchor="middle" font-size="'+(big?fs:fsS)+'">'+KC.lab[k]+'</text>'});
  g.innerHTML=lb;kcLabels();
  var tk=null;window.addEventListener('resize',function(){clearTimeout(tk);tk=setTimeout(kcLabels,120)});
  KC.ids.forEach(function(k){var e=$('kcp_'+k);['mouseenter','focus','click'].forEach(function(ev){e.addEventListener(ev,function(){kcShow(k)})})});
  $('kcBtns').innerHTML=KC.ids.map(function(k){return '<button id="kcb_'+k+'" aria-pressed="false" data-k="'+k+'">'+KC.short[k]+'</button>'}).join('');
  KC.ids.forEach(function(k){$('kcb_'+k).onclick=function(){kcShow(k)}});
  $('kcWork').onclick=function(){kcSetLayer('work')};$('kcSites').onclick=function(){kcSetLayer('sites')};
  $('kcClim').onclick=function(){kcSetLayer('clim')};$('kcCases').onclick=function(){kcSetLayer('cases')};
}
/* label size in screen pixels, whatever the map's width; small areas lose their label when too narrow */
function kcLabels(){var svg=$('kcmap'),vb=svg.viewBox.baseVal;if(!vb||!vb.width||!svg.clientWidth)return;var sc=svg.clientWidth/vb.width;
  KC.ids.forEach(function(k,j){var t=$('kcLabels').children[j],big=k==='192'||k==='26',b=$('kcp_'+k).getBBox();
    t.setAttribute('font-size',((big?13:10.5)/sc).toFixed(2));t.style.strokeWidth=(3/sc).toFixed(2)+'px';
    t.style.display=(!big&&b.width*sc<30)?'none':''})}
function kcLocCard(){
  var m=KA.conf3,t=KA.t12,cols=['#0f5652','#52a29b','#d0602c'];
  var parts=[['high','placed with high confidence'],['medium','medium'],['low_or_unresolved','low or unresolved']];
  var h='<h4>How well each site could be placed</h4><p class="sub2">The '+t.toLocaleString('en-US')+' soil-disturbing and other outdoor employer sites in Kern, by match confidence</p><div class="stackbar" role="img" aria-label="'+parts.map(function(p){return m[p[0]].toLocaleString('en-US')+' '+p[1]}).join(', ')+'">';
  parts.forEach(function(p,i){var v=m[p[0]];if(v)h+='<span style="width:'+(100*v/t).toFixed(2)+'%;background:'+cols[i]+'" title="'+v+' '+p[1]+'"></span>'});
  h+='</div><div class="keyrow" style="flex-wrap:wrap;gap:6px 14px">'+parts.map(function(p,i){return '<span><i style="background:'+cols[i]+'"></i>'+p[1]+' <b>'+m[p[0]].toLocaleString('en-US')+'</b></span>'}).join('')+'</div><ul>';
  h+='<li><b>'+KA.shared_all.toLocaleString('en-US')+'</b> Kern sites, '+KA.shared_t12.toLocaleString('en-US')+' of them in these industries, are at an address shared by five or more businesses, often an accountant or registered agent rather than a work site.</li>';
  h+='<li><b>'+KA.label_outside.toLocaleString('en-US')+'</b> sites listed under Kern in the directory are located outside it, most of them near Delano on the Tulare County side. Like every site on this page, they are counted where they sit.</li>';
  h+='<li><b>'+KA.zip_moved_all.toLocaleString('en-US')+'</b> Kern sites had a directory coordinate in the wrong county and were moved to the center of their ZIP code, so their area may be wrong.</li></ul>';
  $('kcLoc').innerHTML=h;
}
function kcInit(){if(!$('kcmap'))return;kcBuild();kcLocCard();kcIndCounty();kcPaint()}


/* findings as three short bullets (replaces the longer version above) */
function ybFind(){
  var a=YB.areas[ybArea],nm=ybNm(ybArea),l=a.lag,ok=a.median_cases>=20,mn=Math.min.apply(null,a.model),mx=Math.max.apply(null,a.model),h='<h3>What the record shows for '+nm+'</h3>';
  if(Math.max.apply(null,a.cases)===0){$('ybFind').innerHTML=h+'<ul><li>No cases were reported here in any year from 2001 to 2023, so there is nothing to compare with the weather.</li><li><b>Model.</b> The estimate ranged from '+mn+' to '+mx+'.</li></ul><p class="reading"><b>Reading.</b> No cases to judge. No warning rule is drawn from this.</p>';return}
  var s=l.same_winter,x=l.same_winter_excl_reporting,sp=!!(s&&s.p<.05&&s.rho>0),xp=!!(x&&x.p<.05&&x.rho>0),b1;
  if(!ok)b1='Too few cases here (a median of '+Math.round(a.median_cases)+' a year) to test the link with rain. The statewide view and high-incidence counties say more.';
  else{
    b1=sp?'Cases tended to rise after a wetter winter (rank agreement '+ybRho(s.rho)+'; chance alone would give this '+ybChance(s.p)+').'
      :(s&&s.p<.05)?'Cases tended to fall after a wetter winter, the opposite of the published pattern ('+ybRho(s.rho)+').'
      :'No clear link between winter rain and the change in cases ('+(s?ybRho(s.rho):'not computed')+', which chance could produce).';
    if(x)b1+=(sp===xp)?(sp?' It holds without 2010, 2011 and 2019, when reporting rules changed ('+ybRho(x.rho)+').':'')
      :(sp?' It weakens to '+ybRho(x.rho)+' without 2010, 2011 and 2019, when reporting rules changed.':' Without 2010, 2011 and 2019 it strengthens to '+ybRho(x.rho)+', so the picture is mixed.');
    var o=[];[['one_winter_before','one winter earlier'],['two_winters_before','two winters earlier']].forEach(function(q){var v=l[q[0]];if(v&&v.p<.05)o.push('rain '+q[1]+' went with a '+(v.rho>0?'rise':'fall')+' ('+ybRho(v.rho)+')')});
    if(o.length)b1+=' Also, '+o.join(', and ')+'.'}
  var d=a.periods,up=d[0].rate_after>d[0].rate_during&&d[1].rate_after>d[1].rate_during;
  var b2=ybR(d[0].rate_during)+' cases per 100,000 a year during 2007 to 2009, then '+ybR(d[0].rate_after)+' in 2010 and 2011. '+ybR(d[1].rate_during)+' during 2012 to 2016, then '+ybR(d[1].rate_after)+' in 2017 and 2018.'+
    (!ok?' Averages this small move a lot by chance.':up?' Both rises fit the published pattern, though 2010 also brought mandatory lab reporting.':' No consistent rise after the droughts.');
  var m=a.model_vs_rate.changes,b3='Ranged from '+mn+' to '+mx+'. '+((m&&m.p<.05&&m.rho>0)?'Its yearly moves lined up with the case swings ('+ybRho(m.rho)+').':'Its yearly moves did not track the case swings ('+(m?ybRho(m.rho):'not computed')+'). The model ranks places, it does not forecast years.');
  var r=!ok?'Too few cases here to judge.':(sp&&xp)?'Consistent with the published link between a wet winter and more cases the following fall, with only two drought cycles to test it.':(sp||xp)?'Suggestive, but the link depends on which years are counted.':'Inconclusive for this area.';
  $('ybFind').innerHTML=h+'<ul><li><b>Rain and cases.</b> '+b1+'</li><li><b>Droughts.</b> '+b2+'</li><li><b>Model.</b> '+b3+'</li></ul><p class="reading"><b>Reading.</b> '+r+' No warning rule is drawn from this.</p>';
}
/* Kern panel with five rows instead of eight (replaces the version above) */
function kcShow(k){
  if(!PD[k])return;KC.sel=k;var d=PD[k],W=WP[k]||null,w=W?W.t1:null,w2=W?W.t12:null,L=KC.layer;
  KC.ids.forEach(function(j){$('kcp_'+j).classList.toggle('sel',j===k);var b=$('kcb_'+j);if(b)b.setAttribute('aria-pressed',j===k?'true':'false')});
  var cr=(w&&w.cR!==null&&w.cR!==undefined)?Math.round(100*w.cR):null,big,sm;
  if(L==='work'){big=d.pct.toFixed(1)+'%';sm='of workers living here are in agriculture, construction, mining or oil and gas (survey)'}
  else if(L==='sites'){big=kcN(w&&w.e);sm='people employed at '+kcN(w&&w.s)+' soil-disturbing employer sites based here (directory)'}
  else if(L==='clim'){big=(cr===null?'n/a':cr)+'<span style="font-size:19px;font-weight:700"> of 100</span>';sm='climate rank where this area\u2019s soil-disturbing sites sit, 2019 to 2023'}
  else{big=fmtRate(CD.Kern.rateR);sm='reported cases per 100,000 residents per year for Kern County as a whole, 2019 to 2023. Not published for smaller areas.'}
  var h='<h3 style="margin:0;font-size:16.5px">'+KC.short[k]+'</h3><div style="font-size:13px;color:var(--muted)">'+d.n+'</div>';
  h+='<div class="big" style="margin-top:10px">'+big+'<small>'+sm+'</small></div><dl class="kv">';
  h+='<dt>Outdoor workers living here (survey)</dt><dd>'+kcN(d.out)+'</dd>';
  h+='<dt>People at soil-disturbing sites</dt><dd>'+kcN(w&&w.e)+'<small>'+kcN(w&&w.s)+' sites</small></dd>';
  h+='<dt>Adding other outdoor work</dt><dd>'+kcN(w2&&w2.e)+'<small>'+kcN(w2&&w2.s)+' sites</small></dd>';
  h+='<dt>Climate rank at these sites</dt><dd>'+(cr===null?'n/a':cr+' of 100')+'</dd>';
  h+='<dt>Reported cases per 100,000 residents a year, whole county</dt><dd>'+fmtRate(CD.Kern.rateR)+'</dd></dl>';
  h+='<p class="hint">Cases are for 2019 to 2023 and are published for the county as a whole, not for these six areas.</p>';
  h+='<p class="plink"><a href="#years" data-kyb="Kern">Kern year by year</a></p>';
  $('kcPanel').innerHTML=h;
  var rows=[['Agriculture and forestry',d.ag],['Construction',d.con],['Mining, oil and gas',d.min]],mx=Math.max(d.ag,d.con,d.min)||1;
  $('kcIndS').textContent=KC.short[k]+'. People who live here and work in each industry, from the American Community Survey, 2018 to 2022. Counted where they live, not where they work.';
  $('kcInd').innerHTML=rows.map(function(r){return '<div class="nm">'+r[0]+'</div><div class="bar"><i style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:#1c5cab"></i></div><div class="v"><b>'+r[1].toLocaleString('en-US')+'</b></div>'}).join('');
}
/* county industries, with the group named when a code appears in both */
function kcIndCounty(){
  var rows=KA.d3.slice().sort(function(a,b){return b.people-a.people}),mx=rows.length?rows[0].people:1,seen={};
  rows.forEach(function(r){seen[r.code]=(seen[r.code]||0)+1});
  $('kcIndC').innerHTML=rows.map(function(r){var g=seen[r.code]>1?' <span style="color:var(--muted)">('+(r.tier===1?'soil-disturbing':'other outdoor')+')</span>':'';
    return '<div class="nm">'+r.code+' '+r.title+g+'</div><div class="bar"><i style="width:'+(100*r.people/mx).toFixed(1)+'%;background:'+(r.tier===1?'#2a807a':'#7fbdb7')+'"></i></div><div class="v"><b>'+r.people.toLocaleString('en-US')+'</b> at '+r.sites.toLocaleString('en-US')+' sites</div>'}).join('');
}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#kcPanel [data-kyb]'):null;if(!t)return;e.preventDefault();ybGo(t.getAttribute('data-kyb'))});
function tabsInit(){var t=['tab1','tab2','tab3'];
  function pick(i,focus){t.forEach(function(j,k){var b=$(j);b.setAttribute('aria-selected',k===i?'true':'false');b.tabIndex=k===i?0:-1;$('pane'+(k+1)).hidden=k!==i});if(focus)$(t[i]).focus()}
  t.forEach(function(id,i){var b=$(id);$('pane'+(i+1)).setAttribute('aria-labelledby',id);b.onclick=function(){pick(i)};
    b.onkeydown=function(e){var n=e.key==='ArrowRight'?(i+1)%3:e.key==='ArrowLeft'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:-1;if(n>=0){e.preventDefault();pick(n,true)}}});
  pick(0)}
function navInit(){var as=document.querySelectorAll('.nav a');if(!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){as.forEach(function(a){var on=a.getAttribute('href')==='#'+e.target.id;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})}})},{rootMargin:'-45% 0px -50% 0px'});
  ['lookup','map','years','kernclose','who','protect','checked','limits','tech'].forEach(function(id){var el=$(id);if(el)io.observe(el)})}

document.addEventListener('DOMContentLoaded',function(){mapInit();ybInit();kcInit();tabsInit();navInit();});

