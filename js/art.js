/* ================= SILNIK RYSUNKÓW =================
   Proceduralne SVG (viewBox 0 0 200 140, zwierzę patrzy w prawo).
   Każdy archetyp zwraca listę części; paint() rysuje je w przebiegach:
     1. wspólny gruby kontur wszystkich brył   → w trybie 'ghost' tylko to (sylwetka)
     2. wypełnienia brył (bez szwów wewnątrz ciała)
     3. detale: cienkie kontury, oczy, zęby, cienie
   fit() liczy obrys części i skaluje/centruje rysunek, więc nic nie wystaje poza kadr.
   Gatunek → [archetyp|preset, opcje] w js/artspec.js (ART). */

const PAL = [
  ['#7FA86B', '#C9D98A', '#1E3320'], // 0  szałwiowa zieleń
  ['#4E9C93', '#A6DACD', '#123C38'], // 1  petrol
  ['#D2764A', '#F2C48B', '#4A2415'], // 2  rdza
  ['#D9B26F', '#F3E0AE', '#4A3418'], // 3  piasek
  ['#6E8CA8', '#BCD4E3', '#1F3040'], // 4  błękit skalny
  ['#96637F', '#DBB1C5', '#3A1F2E'], // 5  śliwka
  ['#4F7A4A', '#A9CB8C', '#1B2E19'], // 6  las
  ['#B65340', '#EBA687', '#40170F'], // 7  cegła
  ['#C9A227', '#F2E09C', '#453309'], // 8  musztarda
  ['#7C8794', '#C6CED6', '#252B31'], // 9  łupek
  ['#3F8FA6', '#9DD7E2', '#0F3340'], // 10 turkus
  ['#8C6A52', '#D5B695', '#33231A'], // 11 kakao
  ['#8A9440', '#D6DD94', '#2B3010'], // 12 oliwka
  ['#E08A6A', '#F8CBB2', '#4D2417'], // 13 koral
  ['#5A6BA8', '#B3BFE8', '#1C2246'], // 14 indygo
  ['#6B8E5A', '#BCD79D', '#22331A'], // 15 mech
  ['#A85B36', '#E6B38B', '#3A1B0D'], // 16 ochra
  ['#2F6E8F', '#92C6D8', '#0C2734'], // 17 głębina
  ['#8E8783', '#D3CCC4', '#2E2A28'], // 18 słoniowa szarość
  ['#C4924F', '#EDD3A0', '#3D2A12'], // 19 płowy (lwy, koty)
  ['#6E4B33', '#B99472', '#2A1A10'], // 20 futro brązowe
  ['#D9869B', '#F6C9D4', '#4A1F2B'], // 21 róż (morskie bezkręgowce)
];
const IVORY = '#F4ECD8', FIRE = ['#F59E2B', '#FDE68A'], TONGUE = '#D9485F';

/* ---------- kolory, hash ---------- */
function hx2(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function mix(a,b,t){const A=hx2(a),B=hx2(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

/* ---------- geometria: tylko bezwzględne M L C Q Z, żeby fit() mógł czytać ścieżki ---------- */
const PI=Math.PI, R=v=>Math.round(v*10)/10, P=(x,y)=>R(x)+','+R(y);
const LERP=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const DIR=(a,d=1)=>[Math.cos(a*PI/180)*d,Math.sin(a*PI/180)*d];   // kąt w stopniach: 0 = w prawo, -90 = w górę
function CB(Q,t){const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;
  return [a*Q[0][0]+b*Q[1][0]+c*Q[2][0]+d*Q[3][0], a*Q[0][1]+b*Q[1][1]+c*Q[2][1]+d*Q[3][1]];}
const CURVE=(Q,n=8)=>Array.from({length:n+1},(_,i)=>CB(Q,i/n));
/* punkt, styczna i normalna ("lewa" strona kierunku; dla krzywej w prawo = w górę) */
function TN(Q,t){const a=CB(Q,Math.min(1,t+.01)),b=CB(Q,Math.max(0,t-.01)),l=Math.hypot(a[0]-b[0],a[1]-b[1])||1,
  tx=(a[0]-b[0])/l,ty=(a[1]-b[1])/l;return [...CB(Q,t),tx,ty,ty,-tx];}
function EP(cx,cy,rx,ry,rot=0){const k=.5523,c=Math.cos(rot*PI/180),s=Math.sin(rot*PI/180),T=(x,y)=>P(cx+x*c-y*s,cy+x*s+y*c);
  return `M${T(rx,0)} C${T(rx,k*ry)} ${T(k*rx,ry)} ${T(0,ry)} C${T(-k*rx,ry)} ${T(-rx,k*ry)} ${T(-rx,0)} `
    +`C${T(-rx,-k*ry)} ${T(-k*rx,-ry)} ${T(0,-ry)} C${T(k*rx,-ry)} ${T(rx,-k*ry)} ${T(rx,0)} Z`;}
const PL=pts=>'M'+pts.map(p=>P(p[0],p[1])).join(' L');
/* przesuń/obróć/odbij ścieżkę zapisaną w lokalnym układzie (pary "x,y") */
const XF=(d,ox,oy,a=0,sx=1,sy=1)=>{const c=Math.cos(a*PI/180),s=Math.sin(a*PI/180);
  return d.replace(/(-?[\d.]+),(-?[\d.]+)/g,(m,x,y)=>{x*=sx;y*=sy;return P(ox+x*c-y*s,oy+x*s+y*c);});};

/* ---------- części: m0 bryła · m1 bryła + własny cienki kontur · m2 detal z konturem
              m3 plama bez konturu · m4 kolorowa kreska bez konturu ---------- */
const F=(d,f,m=0)=>({d,f,m});
const K=(d,w,f,m=0)=>({d,f,m,k:w});
const BL=(cx,cy,rx,ry,f,m=0,rot=0)=>F(EP(cx,cy,rx,ry,rot),f,m);
const PG=(pts,f,m=0)=>F(PL(pts)+' Z',f,m);
const TRI=(a,b,c,f,m=0)=>PG([a,b,c],f,m);
const LINE=(d,sw=2.4)=>({d,f:'none',m:2,sw});
const SHADE=(d,f,op=.5)=>({d,f,m:3,op});
const STRIPE=(d,f,sw=3,op=.55)=>({d,f,m:4,sw,op});
const TAP=(pts,ws,f,m=0)=>pts.slice(1).map((q,i)=>K(PL([pts[i],q]),ws[i],f,m));
/* rura o zmiennej grubości wzdłuż łamanej (szyje, ogony, trąby, węże) */
const TUBE=(pts,w0,w1,f,m=0)=>pts.slice(1).map((q,i)=>K(PL([pts[i],q]),typeof w0==='function'?w0(i/(pts.length-2||1)):w0+(w1-w0)*i/(pts.length-2||1),f,m));
/* kolce / łuski / pióra wzdłuż krzywej; side=1 lewa strona kierunku rysowania */
function SPINES(Q,n,len,w,f,{t0=.1,t1=.9,side=1,tilt=0,m=0,r=0}={}){const o=[];
  for(let i=0;i<n;i++){const t=n>1?t0+(t1-t0)*i/(n-1):(t0+t1)/2,[x,y,tx,ty,nx,ny]=TN(Q,t),L=typeof len==='function'?len(t,i):len,
      a=[x-tx*w/2,y-ty*w/2],b=[x+tx*w/2,y+ty*w/2],u=nx*side*L+tx*tilt,v=ny*side*L+ty*tilt;
    /* r: zaokrąglony płat (pióra, futro) zamiast kolca */
    o.push(r?F(`M${P(...a)} C${P(a[0]+u*1.3,a[1]+v*1.3)} ${P(b[0]+u*1.3,b[1]+v*1.3)} ${P(...b)} Z`,f,m):TRI(a,[x+u,y+v],b,f,m));}
  return o;}
/* soczewka wokół końca krzywej: pióra ogona, wiosło, łopata łosia */
function VANE(Q,t0,w,f,m=1,t1=1){const a=[],b=[];for(let i=0;i<=10;i++){const t=t0+(t1-t0)*i/10,[x,y,,,nx,ny]=TN(Q,t),h=w*Math.sin(PI*Math.min(.97,.08+i/10*.9));
  a.push([x+nx*h,y+ny*h]);b.unshift([x-nx*h,y-ny*h]);}return PG([...a,...b],f,m);}
/* zakrzywiony róg/kieł/pazur od podstawy (x,y) pod kątem a; bend wygina czubek w bok */
function HORN(x,y,L,a,w,bend,f,m=1){const [dx,dy]=DIR(a),nx=-dy,ny=dx,t=[x+dx*L+nx*bend,y+dy*L+ny*bend],
  c=[x+dx*L*.55+nx*bend*.2,y+dy*L*.55+ny*bend*.2];
  return F(`M${P(x-nx*w/2,y-ny*w/2)} Q${P(c[0]-nx*w*.3,c[1]-ny*w*.3)} ${P(...t)} Q${P(c[0]+nx*w*.3,c[1]+ny*w*.3)} ${P(x+nx*w/2,y+ny*w/2)} Z`,f,m);}
function EYE(x,y,r,ink){return [F(EP(x,y,r,r),'#fff',2),{d:EP(x+r*.18,y,r*.44,r*.48),f:ink,m:3,op:1},
  {d:EP(x-r*.32,y-r*.34,r*.22,r*.22),f:'#fff',m:3,op:.95}];}
function TEETH(x1,y1,x2,y2,n,s=5.4){const o=[],h=Math.abs(s)*.43;for(let i=0;i<n;i++){const [x,y]=LERP([x1,y1],[x2,y2],(i+.5)/n);
  o.push({d:`M${P(x-h,y)} L${P(x,y+s)} L${P(x+h,y)} Z`,f:'#fff',m:2,sw:1.5});}return o;}
function FOOT(x,y,n,f){let d='';for(let i=0;i<n;i++){const o=x+i*7;d+=`M${P(o-3.8,y-9)} L${P(o+3.8,y-9)} L${P(o+4.6,y)} L${P(o-4.6,y)} Z `;}return F(d,f);}
/* noga dwunożna (udo → goleń → stopa) i słupowa noga czworonoga */
function LEG2(x,y,w,f,L=38,n=3){const a=[x+L*.05,y+L];return [...TAP([[x,y],[x+L*.26,y+L*.58],a],[w,w*.64],f),FOOT(a[0]-6,y+L+10,n,f)];}
function LEG4(x,y,w,f,ft='pad',hock=0,G=130){
  const o=TAP(hock?[[x,y],[x+5,y+(G-y)*.38],[x-5,y+(G-y)*.7],[x,G-4]]:[[x,y],[x+2,y+(G-y)*.55],[x,G-4]],hock?[w*1.25,w,w*.8]:[w,w*.85],f);
  if(ft==='pad')o.push(PG([[x-w/2-2,G-5],[x+w/2+3,G-5],[x+w/2+3,G+1],[x-w/2-2,G+1]],f));
  else if(ft==='paw')o.push(BL(x+3,G-2.5,w*.45+3,4.5,f));
  else if(ft==='hoof')o.push(PG([[x-w*.42,G-6],[x+w*.42,G-6],[x+w*.55,G+1],[x-w*.55,G+1]],mix(f,'#000000',.45)));
  return o;}
/* skrzydło z piór: krawędź natarcia S→T, spływu T→H z zaokrąglonymi lotkami */
function WINGF(S,T,H,n,f,m=1){const bow=LERP(LERP(S,T,.5),[S[0],S[1]-40],.12);let d=`M${P(...S)} Q${P(...bow)} ${P(...T)}`;
  for(let i=1;i<=n;i++){const a=LERP(T,H,(i-1)/n),b=LERP(T,H,i/n),mdl=LERP(a,b,.5);let nx=-(b[1]-a[1]),ny=b[0]-a[0];
    if(nx*(S[0]-mdl[0])+ny*(S[1]-mdl[1])>0){nx=-nx;ny=-ny;}d+=` Q${P(mdl[0]+nx*.45,mdl[1]+ny*.45)} ${P(...b)}`;}
  return F(d+' Z',f,m);}
/* błona (pterozaur, smok): bark → nadgarstek → koniec palca, wklęsła krawędź spływu do H */
function MEMB(S,W,T,H,f,bone){const c=LERP(LERP(T,H,.5),W,.3);
  return [F(`M${P(...S)} L${P(...W)} L${P(...T)} Q${P(...c)} ${P(...H)} Z`,f,1),K(PL([S,W,T]),4.5,bone)];}

/* ================= ARCHETYPY =================
   każdy: (c=[baza,jasny,tusz], o=opcje) → {p:części, sc, fly?, water?} */

/* ---------- czaszka dwunożnych: sn długość, D wysokość, tp wysokość pyska na czubku (0..1), hk haczyk ---------- */
const HEADS={rex:[44,28,.9,0],tyr:[40,23,.8,0],long:[50,21,.62,0],allo:[38,20,.7,0],short:[28,24,.88,0],
  croc:[54,15,.3,0],slim:[34,15,.5,0],rap:[30,13,.42,0],beak:[20,11,.25,2],ovi:[19,18,.62,6],tiny:[16,10,.45,1],
  bird:[34,24,.5,11],gast:[30,30,.8,5],duck:[36,17,.62,3],iguano:[32,18,.72,1],dome:[24,20,.5,1],parrot:[18,18,.68,7],
  small:[20,12,.42,1],deino:[34,13,.7,2]};
function SKULL(hx,hy,sn,D,tp,hk){const T=hy+D*(1-tp)*.55,B=hy+D-D*(1-tp)*.35,X=hx+sn;
  return {T,B,X,d:`M${P(hx-6,hy+2)} C${P(hx+sn*.35,hy-4)} ${P(X-sn*.2,T-1)} ${P(X,T)} C${P(X+4,T+1)} ${P(X+4,B+hk-1)} ${P(X+hk*.3,B+hk)} `
    +`C${P(X-sn*.4,B+3)} ${P(hx+sn*.25,hy+D+5)} ${P(hx-8,hy+D)} Z`};}

/* ---------- dwunożni i półczworonożni: teropody, raptory, strusiopodobne, ptaki terroru, smok,
              prozauropody, ornitopody, kaczodziobe, grubogłowe, psitakozaur ---------- */
function A_thero(c,o){
  const mid=mix(c[0],c[2],.4),p=[],[sn,D,tp,hk]=o.hs||HEADS[o.hd||'allo'],lg=o.lg||1,L=38*lg,
    rx=o.bw||33,ry=o.bh||22,bx=100,by=114-L,lw=o.lw||22,herb=o.herb||o.bk,
    tl=o.tl??1,td=o.td??18,T0=[bx-rx*.76,by-4],
    TQ=[T0,[T0[0]-24*tl,by-2+td*.1],[T0[0]-48*tl,by+td*.45],[T0[0]-68*tl,by+td]],
    S=[bx+rx*.5,by-ry*(o.q?.1:.5)],nk=o.nk||[28,-28],Hb=[S[0]+nk[0],S[1]+nk[1]],hx=Hb[0]-2,hy=Hb[1]-D*.5,
    NQ=[S,[S[0]+nk[0]*.1,S[1]+nk[1]*.6],[S[0]+nk[0]*.55,S[1]+nk[1]],Hb],
    BQ=[[bx+rx*.6,by-ry*.8],[bx+rx*.2,by-ry*1.25],[bx-rx*.5,by-ry*1.2],[bx-rx*.95,by-ry*.4]],
    A=[bx+rx*.76,by+2],aL=o.arm||10,nw=o.nw||ry*1.2,sk=SKULL(hx,hy,sn,D,tp,hk),
    ex=hx+Math.min(sn*.3,13)*(o.eyx||1),ey=hy+D*.32,er=Math.max(3.2,Math.min(5,D*.2))*(o.ey||1);
  /* w tle: dalsza noga, dalsza przednia noga, skrzydło smoka, żagiel, pióra */
  p.push(...LEG2(bx-12,by+4,lw*.9,mid,L));
  if(o.q) p.push(...LEG4(A[0]-6,A[1],11,mid,'hoof',0,128));
  if(o.bat) p.push(...MEMB([bx+6,by-ry*.6],[bx-14,by-ry-46],[bx-78,by-ry-34],[bx-rx*.6,by-4],c[1],c[0]),
    LINE(PL([[bx-14,by-ry-46],[bx-66,by-ry-6]]),2),LINE(PL([[bx-14,by-ry-46],[bx-42,by+2]]),2));
  if(o.sail){const SQ=[[bx-rx*.95,by-ry*.2],[bx-rx*.7,by-ry-64],[bx+rx*.7,by-ry-68],[bx+rx*1.05,by-ry*.4]];
    p.push(F(`M${P(...SQ[0])} C${SQ.slice(1).map(q=>P(...q)).join(' ')} Z`,c[1],1),
    ...[.15,.3,.45,.6,.75,.88].map(t=>LINE(PL([CB(SQ,t),[SQ[0][0]+(SQ[3][0]-SQ[0][0])*t,by-ry*.3]]),2.2)));}
  if(o.hump) p.push(F(`M${P(bx-rx*.9,by-4)} C${P(bx-rx*.7,by-ry-40)} ${P(bx+rx*.5,by-ry-40)} ${P(bx+rx*.7,by-6)} Z`,c[0]),
    ...[.25,.45,.65].map(t=>LINE(PL([CB([[bx-rx*.9,by-4],[bx-rx*.7,by-ry-40],[bx+rx*.5,by-ry-40],[bx+rx*.7,by-6]],t),[bx-rx*.6+rx*1.3*t,by-ry*.6]]),2)));
  if(o.fz) p.push(...SPINES(TQ,9,7,10,c[0],{side:-1,tilt:3,t0:.05,t1:.92,r:1}),...SPINES(BQ,5,6,12,c[0],{side:-1,tilt:3,r:1}),
    ...SPINES(NQ,4,6,10,c[0],{side:1,tilt:-3,t0:.15,t1:.8,r:1}));
  if(o.spk) p.push(...SPINES(TQ,6,9,9,c[1],{side:-1,tilt:3,t0:.08,t1:.8,m:1}),...SPINES(BQ,4,11,10,c[1],{side:-1,tilt:3,m:1}),
    ...SPINES(NQ,3,9,9,c[1],{side:1,tilt:-3,t0:.2,t1:.8,m:1}));
  if(o.brist) p.push(...SPINES(TQ,6,14,3,c[1],{side:-1,t0:.05,t1:.5,tilt:4,m:1}));
  if(o.osteo) p.push(...SPINES(BQ,6,6,8,c[1],{side:-1,t0:0,t1:1,m:1}),...SPINES(TQ,4,5,7,c[1],{side:-1,t0:.05,t1:.5,m:1}));
  /* ogon */
  if(o.tail==='fan') p.push(WINGF([bx-rx*.5,by-ry*.5],[bx-rx-30,by-ry*.2-10],[bx-rx*.6,by+ry*.4],4,c[1]));
  else { if(o.vane) p.push(VANE(TQ,o.vane[0],o.vane[1],c[1]));
    p.push(...TUBE(CURVE(TQ,6),o.tw||ry*1.2,3.5,c[0]));
    if(o.spade){const [x,y]=TQ[3];p.push(TRI([x+4,y-6],[x-14,y+2],[x+4,y+8],c[1],1));}
    if(o.tstr) p.push(...[.4,.52,.64,.76,.88].map(t=>{const [x,y,,,nx,ny]=TN(TQ,t),w=(o.tw||ry*1.2)*(1-t)*.5+2;
      return STRIPE(PL([[x+nx*w,y+ny*w],[x-nx*w,y-ny*w]]),c[2],4,.45);})); }
  /* tułów */
  p.push(BL(bx,by,rx,ry,c[0],0,o.rot??(o.q?12:0)));
  if(o.rdg) p.push(F(`M${P(bx-rx-26,by-2)} C${P(bx-rx*.8,by-ry-20)} ${P(bx+rx*.4,by-ry-22)} ${P(bx+rx*.8,by-ry*.6)} Z`,c[0]),
    ...[.25,.45,.65,.85].map(t=>LINE(PL([CB([[bx-rx-26,by-2],[bx-rx*.8,by-ry-20],[bx+rx*.4,by-ry-22],[bx+rx*.8,by-ry*.6]],t),[bx-rx-18+rx*2*t,by-ry*.5]]),2)));
  if(o.bumps) for(let i=0;i<7;i++) p.push(SHADE(EP(bx-rx*.6+i*rx*.2,by-ry*.55+(i%2)*6,3.4,3),mix(c[1],c[2],.2),.7));
  p.push(SHADE(`M${P(bx-rx*.7,by+ry*.5)} C${P(bx-rx*.2,by+ry*1.25)} ${P(bx+rx*.5,by+ry*1.2)} ${P(bx+rx*.9,by+ry*.3)} `
    +`C${P(bx+rx*.5,by+ry*.95)} ${P(bx-rx*.2,by+ry*.95)} ${P(bx-rx*.7,by+ry*.5)} Z`,c[1],.5));
  /* szyja, grzebienie za głową, głowa */
  p.push(...TUBE(CURVE(NQ,5),nw,nw*.8,c[0]));
  if(o.cr==='tube') p.push(K(`M${P(hx+sn*.35,hy+3)} C${P(hx+4,hy-8)} ${P(hx-20,hy-14)} ${P(hx-38,hy-14)}`,10,c[1]));
  if(o.cr==='helm') p.push(F(`M${P(hx+sn*.62,hy+6)} C${P(hx+sn*.6,hy-24)} ${P(hx-8,hy-30)} ${P(hx-10,hy+4)} Z`,c[1],1),
    LINE(`M${P(hx+sn*.35,hy+2)} C${P(hx+sn*.3,hy-14)} ${P(hx+2,hy-16)} ${P(hx-2,hy+2)}`,2));
  if(o.cr==='hatch') p.push(F(`M${P(hx+sn*.25,hy+4)} C${P(hx+sn*.3,hy-10)} ${P(hx+sn*.35,hy-22)} ${P(hx+sn*.55,hy-26)} `
    +`C${P(hx+sn*.62,hy-14)} ${P(hx+sn*.62,hy-4)} ${P(hx+sn*.6,hy+5)} Z`,c[1],1),HORN(hx+2,hy+3,18,-155,8,2,c[1]));
  if(o.cr==='spike') p.push(HORN(hx+sn*.3,hy+2,26,-160,9,6,c[1]));
  if(o.cr2) p.push(F(`M${P(hx+2,hy+3)} C${P(hx+sn*.1,hy-16)} ${P(hx+sn*.6,hy-14)} ${P(hx+sn*.85,sk.T+2)} Z`,mid),
    F(`M${P(hx+sn*.1,hy+4)} C${P(hx+sn*.2,hy-12)} ${P(hx+sn*.7,hy-10)} ${P(hx+sn*.9,sk.T+3)} Z`,c[1],1));
  if(o.cryo) p.push(F(`M${P(ex-9,hy+3)} C${P(ex-12,hy-16)} ${P(ex+10,hy-20)} ${P(ex+12,hy+3)} Z`,c[1],1),
    ...[-4,1,6].map(d=>LINE(PL([[ex+d,hy+1],[ex+d*1.4,hy-12]]),1.8)));
  if(o.ncr) p.push(F(`M${P(hx+2,hy+2)} C${P(hx+sn*.3,hy-11)} ${P(hx+sn*.7,hy-7)} ${P(hx+sn*.9,sk.T+1)} Z`,c[1],1));
  p.push(F(sk.d,c[0]));
  if(o.hd==='dome'){const dr=o.dm||1;p.push(BL(hx+sn*.3,hy+3,sn*.52*dr,D*.62*dr,c[0]),
      SHADE(EP(hx+sn*.32,hy-D*.12*dr,sn*.38*dr,D*.3*dr,-8),c[1],.8),
      ...SPINES([[hx-6,hy+D*.6],[hx-10,hy-6],[hx-2,hy-D*.5],[hx+10,hy-D*.6]],o.dspk?4:5,o.dspk?16:5,6,c[1],{side:1,t0:.05,t1:.5,tilt:o.dspk?-6:0,m:1}),
      ...SPINES([[hx+sn*.6,sk.T+2],[hx+sn*.8,sk.T],[hx+sn*.9,sk.T],[hx+sn,sk.T+1]],3,4,5,c[1],{side:1,m:1}));}
  if(o.bk){const x0=sk.X-sn*o.bk,y0=hy+(sk.T-hy)*(1-o.bk*.6)+2,dk=o.hd==='duck'?5:2;
    p.push({d:`M${P(x0,y0)} C${P(x0+sn*o.bk*.5,sk.T-1)} ${P(sk.X+dk,sk.T-2)} ${P(sk.X+dk+1,(sk.T+sk.B)/2)} C${P(sk.X+dk+1,sk.B+hk)} ${P(sk.X+hk*.3,sk.B+hk)} ${P(sk.X-2,sk.B+hk)} `
    +`C${P(x0+sn*o.bk*.4,sk.B+3)} ${P(x0,sk.B+3)} ${P(x0,sk.B+1)} Z`,f:mix(c[1],c[2],.15),m:2,sw:2.2});}
  const my=(sk.T+sk.B)/2+1.5;
  p.push(LINE(`M${P(hx+2,hy+D*.62)} C${P(hx+sn*.4,hy+D*.8)} ${P(sk.X-sn*.2,my+2)} ${P(sk.X+1,my)}`,2.4));
  if(!herb) p.push(...TEETH(hx+10,hy+D*.72,sk.X-5,my+1,o.bt?4:Math.max(3,Math.round(sn/8)),o.bt?8:5.4));
  if(o.tusk) p.push(HORN(hx+sn*.55,my,8,95,4,-1,IVORY));
  p.push(...EYE(ex,ey,er,c[2]));
  if(o.hrn) p.push(TRI([ex-3,hy+1],[ex+1,hy-10],[ex+8,hy+2],c[1],1));
  if(o.brow) p.push(BL(ex+1,hy+1,6,4,c[1],1));
  if(o.nose) p.push(HORN(hx+sn*.62,sk.T+(hy-sk.T)*.3+3,15,-78,9,2,c[1]));
  if(o.bull) p.push(HORN(ex-2,hy+3,16,-120,9,-5,c[1]));
  if(o.boss) p.push(HORN(ex+2,hy+2,7,-95,9,0,c[1]));
  if(o.cheek) p.push(HORN(hx+sn*.2,hy+D*.8,10,125,7,0,c[1]));
  if(o.cr==='bump') p.push(BL(hx+sn*.5,hy+1,8,5,c[1],1));
  if(o.fire) p.push(F(`M${P(sk.X+2,my)} C${P(sk.X+14,my-10)} ${P(sk.X+26,my-4)} ${P(sk.X+34,my-12)} C${P(sk.X+32,my+2)} ${P(sk.X+40,my+6)} ${P(sk.X+30,my+12)} C${P(sk.X+20,my+10)} ${P(sk.X+12,my+8)} ${P(sk.X+2,my+2)} Z`,FIRE[0],2),
    F(`M${P(sk.X+6,my+1)} C${P(sk.X+14,my-4)} ${P(sk.X+22,my)} ${P(sk.X+28,my-4)} C${P(sk.X+28,my+4)} ${P(sk.X+20,my+6)} ${P(sk.X+6,my+2)} Z`,FIRE[1],3));
  /* ramię / przednia noga */
  if(o.q) p.push(...LEG4(A[0]+6,A[1],13,c[0],'hoof',0,128));
  else if(aL){const fwd=o.ak==='fwd',H=fwd?[A[0]+aL,A[1]+aL*.3]:[A[0]+aL,A[1]+aL*.7+4],
      E=fwd?[A[0]+aL*.5,A[1]+aL*.35]:[A[0]+aL*.6,A[1]+aL*.35+4];
    if(o.wg) p.push(WINGF(A,H,[A[0]-10,A[1]+ry*.7],4,c[1]));
    p.push(K(PL([A,E,H]),o.aw||9,c[0]));
    for(let i=0;i<(o.clw||0);i++) p.push(HORN(H[0]-2+i*(fwd?4:3),H[1],o.cl||6,fwd?70-i*18:70-i*14,o.cl>12?8:3.5,fwd?(o.cl||6)*.45:-1.5,c[1]));
    if(o.thumb) p.push(HORN(H[0]-2,H[1]-2,o.thumb>1?13:8,-50,o.thumb>1?7:5,0,c[1]));}
  p.push(...LEG2(bx+6,by+4,lw,c[0],L));
  if(o.sick){const x=bx+6+L*.05,y=by+4+L;p.push(K(`M${P(x+4,y+4)} C${P(x+12,y+2)} ${P(x+16,y-4)} ${P(x+16,y-12)}`,5,c[1]));}
  return {p,sc:o.sc||1};
}

/* ---------- zauropod: fl/hl przednie/tylne nogi, szyja kąt na / długość nl ---------- */
const SHEAD={std:'M-9,-8 C6,-13 19,-7 18,3 C16,11 -3,12 -11,6 Z',long:'M-9,-7 C8,-11 24,-5 25,2 C24,8 2,10 -11,6 Z',
  box:'M-9,-10 C4,-15 15,-10 17,-2 L17,8 C10,12 -4,12 -11,6 Z',mower:'M-10,-8 C4,-12 15,-9 17,-4 L20,11 L-3,10 C-11,8 -12,0 -10,-8 Z',
  brach:'M-9,-8 C-4,-22 12,-22 12,-8 C18,-6 20,-2 19,3 C16,11 -3,12 -11,6 Z'};
function A_sauro(c,o){
  const mid=mix(c[0],c[2],.4),p=[],G=130,fl=o.fl||38,hl=o.hl||38,rx=o.bw||42,ry=o.bh||26,
    hip=[74,G-hl-4],sh=[124,G-fl-4],rot=Math.atan2(sh[1]-hip[1],50)*180/PI,
    bx=(hip[0]+sh[0])/2,by=(hip[1]+sh[1])/2-ry*.45,
    RT=(x,y)=>{const a=rot*PI/180;return [bx+x*Math.cos(a)-y*Math.sin(a),by+x*Math.sin(a)+y*Math.cos(a)];},
    na=o.na??38,nl=o.nl||72,nc=o.nc??10,nw=o.nw||24,N0=RT(rx*.72,-ry*.35),
    N3=[N0[0]+DIR(-na,nl)[0],N0[1]+DIR(-na,nl)[1]],
    NQ=[N0,[N0[0]+DIR(-na-nc,nl*.35)[0],N0[1]+DIR(-na-nc,nl*.35)[1]],[N3[0]-DIR(-na+nc,nl*.35)[0],N3[1]-DIR(-na+nc,nl*.35)[1]],N3],
    tl=o.tl||1,T0=RT(-rx*.8,-ry*.15),TQ=[T0,[T0[0]-26*tl,T0[1]+2],[T0[0]-50*tl,T0[1]+12+(o.tu||0)],[T0[0]-70*tl,T0[1]+22+(o.tu||0)]],
    BQ=[RT(rx*.7,-ry*.7),RT(rx*.3,-ry*1.05),RT(-rx*.3,-ry*1.05),RT(-rx*.8,-ry*.5)],lw=o.lw||20,
    ha=o.ha??18,hk=o.hd||'std',hx=(x,y)=>{const a=ha*PI/180;return [N3[0]+x*Math.cos(a)-y*Math.sin(a),N3[1]+x*Math.sin(a)+y*Math.cos(a)];};
  p.push(...LEG4(hip[0]-8,hip[1],lw,mid),...LEG4(sh[0]-8,sh[1],lw,mid));
  p.push(...TUBE(CURVE(TQ,6),ry*.95,o.whip?5:4,c[0]));
  if(o.whip){const [x,y]=TQ[3];p.push(...TUBE(CURVE([[x,y],[x-14,y+4],[x-30,y+6],[x-48,y+2]],5),4,1.5,c[0]));}
  if(o.spn) p.push(...SPINES(NQ.map(q=>[q[0]-4,q[1]-3]),7,24,6,mid,{t0:.08,t1:.8,tilt:-3}));
  p.push(F(EP(bx,by,rx,ry,rot),c[0]));
  p.push(SHADE(`M${P(...RT(-rx*.8,ry*.35))} C${P(...RT(-rx*.3,ry*1.15))} ${P(...RT(rx*.4,ry*1.15))} ${P(...RT(rx*.85,ry*.3))} `
    +`C${P(...RT(rx*.4,ry*.9))} ${P(...RT(-rx*.3,ry*.9))} ${P(...RT(-rx*.8,ry*.35))} Z`,c[1],.45));
  if(o.arm2) p.push(...SPINES(BQ,7,4,7,c[1],{t0:0,t1:1,side:-1,m:1}),...[0,1,2,3,4,5,6,7].map(i=>{const [x,y]=CB(BQ,i/8+.05);return SHADE(EP(x+(i%2?3:-2),y+8+(i%3)*5,3.4,3),mix(c[0],c[2],.3),.8);}));
  p.push(...TUBE(CURVE(NQ,7),nw,nw*.5,c[0]));
  if(o.spn) p.push(...SPINES(NQ,7,26,6,c[1],{t0:.1,t1:.82,tilt:-3,m:1}),...SPINES(BQ,3,12,6,c[1],{side:-1,t0:0,t1:.4,m:1}));
  p.push(F(XF(SHEAD[hk],...N3,ha),c[0]));
  p.push(...EYE(...hx(3,-2),3.8,c[2]),LINE(PL([hx(hk==='mower'?4:3,7),hx(hk==='long'?22:16,hk==='mower'?9:5)]),2.2));
  if(hk==='mower') p.push(STRIPE(PL([hx(19,-2),hx(20,9)]),mix(c[1],c[2],.2),3,.8));
  p.push(...LEG4(hip[0]+4,hip[1],lw*1.1,c[0]),...LEG4(sh[0]+4,sh[1],lw*1.1,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- ceratops: kryza fr, rogi brwiowe/nosowe, guzy ---------- */
const FRILL={round:[27,28,-15],plain:[22,23,-20],spiky:[24,26,-15],hook:[24,26,-15],tall:[22,34,-35],huge:[30,34,-30],curly:[25,27,-15],
  ring:[24,26,-15],small:[15,16,-20],none:[0,0,0]};
function A_cerat(c,o){
  const mid=mix(c[0],c[2],.4),p=[],fr=o.fr||'round',[fa,fb,frot]=FRILL[fr],FX=126,FY=50,hc=c[1];
  p.push(...LEG4(68,90,18,mid),...LEG4(110,90,18,mid));
  p.push(...TUBE(CURVE([[56,82],[38,84],[24,90],[12,96]],3),22,8,c[0]));
  p.push(BL(86,84,37,25,c[0]));
  p.push(SHADE('M56,92 C78,106 116,106 130,92 C122,106 66,110 56,92 Z',c[1],.45));
  p.push(K(PL([[112,76],[128,66]]),32,c[0]));
  if(fa){const rim=t=>{const a=(-40-t*190)*PI/180,r=frot*PI/180,x=Math.cos(a)*fa,y=Math.sin(a)*fb;
      return [FX+x*Math.cos(r)-y*Math.sin(r),FY+x*Math.sin(r)+y*Math.cos(r)];};
    const deco=(n,t0,t1,fn)=>{for(let i=0;i<n;i++){const t=t0+(t1-t0)*i/Math.max(1,n-1),[x,y]=rim(t),[ux,uy]=[x-FX,y-FY],l=Math.hypot(ux,uy);fn(x,y,ux/l,uy/l,i);}};
    if(fr==='spiky') deco(6,0,.62,(x,y,ux,uy,i)=>p.push(HORN(x-ux*3,y-uy*3,i>1&&i<5?26:18,Math.atan2(uy,ux)*180/PI,7,-3,hc)));
    if(fr==='hook') deco(2,.05,.22,(x,y,ux,uy)=>p.push(HORN(x-ux*3,y-uy*3,20,Math.atan2(uy,ux)*180/PI+25,7,12,hc)));
    if(fr==='curly') deco(9,0,.55,(x,y,ux,uy)=>p.push(HORN(x-ux*2,y-uy*2,14,Math.atan2(uy,ux)*180/PI+20,6,7,hc)));
    if(fr==='ring') deco(9,0,.75,(x,y,ux,uy)=>p.push(HORN(x-ux*2,y-uy*2,12,Math.atan2(uy,ux)*180/PI+35,6,6,hc)));
    if(fr==='round'||fr==='huge'||fr==='tall') deco(fr==='round'?10:8,0,.9,(x,y,ux,uy)=>p.push(TRI([x-uy*4,y+ux*4],[x+ux*7,y+uy*7],[x+uy*4,y-ux*4],hc,1)));
    if(o.fspk) deco(4,.05,.45,(x,y,ux,uy,i)=>p.push(HORN(x-ux*3,y-uy*3,16,Math.atan2(uy,ux)*180/PI+(i-1.5)*10,7,-2,hc)));
    p.push(BL(FX,FY,fa+2,fb+2,hc,1,frot));
    if(o.win) p.push(SHADE(EP(FX-fa*.3,FY-fb*.25,fa*.28,fb*.35,frot),mix(c[1],c[2],.35),.6),SHADE(EP(FX+fa*.05,FY-fb*.45,fa*.25,fb*.3,frot),mix(c[1],c[2],.35),.6));
    else p.push(SHADE(EP(FX,FY,fa-7,fb-8,frot),mix(c[1],c[2],.18),.35));}
  p.push(F('M124,50 C150,40 178,50 190,68 C194,77 184,84 170,82 C148,79 130,72 122,62 Z',c[0]));
  if(o.brow){const [l,a]=o.brow;p.push(HORN(146,50,l,a,8,-3,mix(hc,c[2],.15)),HORN(156,52,l,a+4,9,-3,hc));}
  if(o.nose) p.push(HORN(172,62,o.nose,-80+(o.nose>24?8:0),9,o.nose>24?-2:3,hc));
  if(o.boss) p.push(BL(166,58,13,8,hc,1,-10));
  if(o.cheek) p.push(HORN(150,72,16,125,8,0,hc));
  p.push(F('M178,66 C192,66 194,76 184,84 C178,85 173,79 174,74 Z',mix(c[1],c[2],.4),2));
  p.push(...EYE(158,62,4.4,c[2]),LINE('M150,76 C160,80 170,80 178,78',2.2));
  p.push(...LEG4(76,86,22,c[0]),...LEG4(118,86,22,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- pancerny: club maczuga, spk kolce, shd kolce barkowe, glyp kopuła gliptodonta ---------- */
function A_armor(c,o){
  const mid=mix(c[0],c[2],.4),p=[],gl=o.glyp,top=gl?46:62;
  p.push(...LEG4(70,100,17,mid),...LEG4(118,100,17,mid));
  if(o.club){p.push(...TUBE(CURVE([[46,98],[34,99],[24,101],[18,102]],3),19,13,c[0]));
    p.push(BL(15,102,13,11,c[1],1),TRI([2,96],[8,102],[2,108],c[1]),TRI([16,89],[14,99],[23,94],c[1]));}
  else if(gl){p.push(...TUBE(CURVE([[46,98],[32,102],[20,108],[10,114]],4),18,10,c[0]));
    for(let i=0;i<4;i++)p.push(LINE(PL([[38-i*8,92+i*4],[40-i*8,106+i*4]]),2.2));}
  else{p.push(...TUBE(CURVE([[46,98],[30,99],[18,102],[8,105]],3),19,8,c[0]));
    for(let i=0;i<3;i++)p.push(TRI([16+i*10,98-i],[13+i*10,86-i*2],[24+i*10,96-i],c[1]));}
  p.push(F(`M40,104 C38,${top+14} 66,${top} 96,${top} C126,${top} 154,${top+14} 152,104 C152,110 140,110 96,110 C52,110 40,110 40,104 Z`,c[0]));
  if(o.spk)for(let i=0;i<5;i++){const t=(i+.5)/5,x=48+t*96,y=104-Math.sin(t*PI)*(104-top-2);p.push(TRI([x-6,y+3],[x,y-16],[x+6,y+4],c[1]));}
  const rows=gl?4:1;
  for(let r=0;r<rows;r++)for(let i=0;i<8-r;i++){const t=(i+.5)/(8-r),x=46+t*100,y=104-Math.sin(t*PI)*(104-top-4)+r*12;
    p.push(SHADE(gl?EP(x,y+6,5.5,4.5):EP(x,y+4,6.5,5),mix(c[1],c[2],.08),gl?.55:.8));}
  if(!gl)for(let i=0;i<5;i++)p.push(SHADE(`M${44+i*24},108 L${50+i*24},100 L${56+i*24},108 Z`,mix(c[1],c[2],.08),.7));
  else p.push(SHADE('M42,104 C60,110 132,110 150,104 L150,108 C130,112 60,112 42,108 Z',c[1],.6));
  if(o.shd)for(let i=0;i<3;i++)p.push(TRI([142-i*12,88-i*4],[172-i*10,70-i*8],[146-i*12,98-i*3],c[1]));
  p.push(K(PL([[142,94],[156,94]]),24,c[0]));
  p.push(F(gl?'M148,84 C158,78 174,82 178,94 C180,102 170,106 160,104 C150,102 146,94 148,88 Z'
    :'M150,82 C162,74 180,76 188,88 C192,96 184,102 172,102 C158,102 150,96 148,90 Z',c[0]));
  if(gl) p.push(F('M146,86 C152,74 170,74 176,86 C166,82 156,82 146,86 Z',c[1],1));
  else p.push(TRI([154,80],[158,70],[164,81],c[1]),TRI([168,78],[173,69],[178,80],c[1]),HORN(156,96,12,150,7,2,c[1]));
  p.push(...EYE(gl?162:165,gl?91:88,4,c[2]),LINE(gl?'M166,100 L178,98':'M172,97 L187,94',2.2));
  p.push(...LEG4(80,98,19,c[0],gl?'paw':'pad'),...LEG4(128,98,19,c[0],gl?'paw':'pad'));
  return {p,sc:o.sc||1};
}

/* ---------- stegozaur: płyty w dwóch rzędach, kolce ogona ts, pl:'spike' kolce z tyłu ---------- */
function A_stego(c,o){
  const mid=mix(c[0],c[2],.4),n=o.n||8,p=[],H=o.ph||1;
  const plate=(x,y,s,f,m,sp)=>sp?TRI([x-5*s,y+5],[x+2*s,y-24*s],[x+6*s,y+6],f,m)
    :F(`M${P(x,y+7)} C${P(x-13*s,y-4*s)} ${P(x-8*s,y-22*s)} ${P(x+1*s,y-28*s)} C${P(x+8*s,y-20*s)} ${P(x+13*s,y-4*s)} ${P(x,y+7)} Z`,f,m);
  const row=(dx,dy,f,m)=>{for(let i=0;i<n;i++){const t=(i+.5)/n,x=58+t*84+dx,y=96-Math.sin(t*PI)*38+dy,s=(.6+Math.sin(t*PI)*.55)*H;
    p.push(plate(x,y,s,f,m,o.pl==='spike'&&t<.55));}};
  p.push(...LEG4(76,98,17,mid),...LEG4(120,96,18,mid));
  p.push(...TUBE(CURVE([[54,94],[36,96],[22,98],[10,100]],3),22,10,c[0]));
  for(let i=0;i<(o.ts||4);i++) p.push(HORN(16+i*8,98-i,o.ts>4?16:20,-150+i*18,7,-2,c[1]));
  row(6,-4,mid,0);
  p.push(F('M50,98 C52,70 80,54 104,56 C130,58 146,76 148,98 C149,108 130,110 100,110 C68,110 49,108 50,98 Z',c[0]));
  p.push(SHADE('M60,100 C82,112 124,112 142,100 C136,112 90,116 60,100 Z',c[1],.45));
  row(0,0,c[1],1);
  if(o.shd) p.push(HORN(134,90,26,-30,9,-4,c[1]));
  const nk=o.nk?1:0;
  p.push(...TUBE(CURVE(nk?[[132,84],[150,72],[166,62],[176,58]]:[[138,88],[150,82],[160,78],[166,76]],4),22,17,c[0]));
  const X=nk?182:172,Y=nk?54:70;
  p.push(F(`M${X-12},${Y-6} C${X+2},${Y-11} ${X+16},${Y-4} ${X+16},${Y+4} C${X+14},${Y+12} ${X-4},${Y+13} ${X-12},${Y+8} Z`,c[0]));
  p.push(...EYE(X+1,Y,3.9,c[2]),LINE(`M${X+2},${Y+8} L${X+15},${Y+6}`,2.2));
  p.push(...LEG4(86,96,19,c[0]),...LEG4(128,94,20,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- pterozaur: w locie (skrzydła błoniaste w X) lub stojący (azdarchidy) ---------- */
function A_ptero(c,o){
  const mid=mix(c[0],c[2],.42),p=[],bl=o.bl||44,hd=o.hd||13,memN=o.mem||c[1],memF=mix(memN,c[2],.3);
  const head=(x,y,a)=>{const loc=[];
    if(o.cr==='back') loc.push(F(`M2,-6 L${-bl*.9},-24 L${-bl*.75},-15 L-2,4 Z`,c[1],1));
    if(o.cr==='sail') loc.push(F(`M${bl*.45},-2 C${bl*.4},-52 -26,-50 -12,-4 Z`,c[1],1),LINE(`M${bl*.2},-6 C${bl*.1},-30 -8,-34 -6,-6`,1.8));
    if(o.cr==='mast') loc.push(K('M-2,-6 C-6,-24 -12,-40 -14,-58',5,c[1]),K('M-10,-36 C-20,-40 -30,-40 -38,-36',4.5,c[1]));
    if(o.cr==='small') loc.push(F(`M4,-7 C-6,-14 -16,-12 -20,-4 C-10,-4 -2,-2 4,2 Z`,c[1],1));
    if(o.cr==='quetz') loc.push(F(`M${bl*.1},-6 C${bl*.15},-16 ${bl*.4},-14 ${bl*.45},-4 Z`,c[1],1));
    if(o.cr==='keel') loc.push(F(`M${bl*.56},${-hd*.1} C${bl*.64},-11 ${bl*.93},-10 ${bl*.97},${hd*.15} Z`,c[1],1),
      F(`M${bl*.58},${hd*.45} C${bl*.66},${hd*.45+8} ${bl*.92},${hd*.3+8} ${bl*.97},${hd*.2} Z`,c[1],1));
    loc.push(F(`M-8,${-hd*.4} C0,${-hd*.9} 12,${-hd*.8} ${bl*.35},${-hd*.35} L${bl},${hd*.2} L${bl*.35},${hd*.55} C10,${hd*.8} -2,${hd*.8} -10,${hd*.3} Z`,c[0]));
    loc.push(LINE(`M0,${hd*.25} L${bl*.97},${hd*.2}`,2));
    if(!o.bk) loc.push(...TEETH(bl*.3,hd*.3,bl*.85,hd*.2,4,4.5));
    const [ex,ey]=XF('4,'+(-hd*.1),x,y,a).split(',').map(Number);
    return loc.map(q=>({...q,d:XF(q.d,x,y,a)})).concat(EYE(ex,ey,hd>16?5:4.2,c[2]));};
  if(o.stand){
    p.push(...TAP([[72,96],[66,112],[70,126]],[9,6],mid),FOOT(66,130,2,mid));
    p.push(...TAP([[102,78],[92,102],[108,126]],[10,7],mid));
    p.push(BL(84,88,24,15,c[0],0,-20));
    p.push(F('M104,78 C98,92 90,102 86,104 C80,100 72,96 70,92 Z',memN,1));
    p.push(...TUBE(CURVE([[100,78],[108,58],[114,40],[118,26]],5),o.nw||13,(o.nw||13)*.8,c[0]));
    p.push(...head(118,24,o.ha??38));
    p.push(...TAP([[80,98],[76,112],[82,126]],[10,7],c[0]),FOOT(78,130,2,c[0]));
    p.push(...TAP([[106,80],[98,104],[116,126]],[11,8],c[0]),F('M110,124 L124,124 L124,130 L110,130 Z',c[0]));
    return {p,sc:o.sc||1};}
  p.push(...MEMB([100,80],[92,110],[30,128],[80,86],memF,mid));
  p.push(K('M86,86 C74,92 64,96 54,100',6,mid),K('M88,88 C78,98 70,102 62,108',6,c[0]));
  if(o.tl){p.push(K('M84,84 C64,88 44,90 24,88',3.5,c[0]),VANE([[84,84],[64,88],[44,90],[22,88]],.82,7,c[1]));}
  p.push(BL(98,80,20,11,c[0],0,-12));
  p.push(...MEMB([104,72],[84,38],[14,16],[82,86],memN,c[0]));
  for(let i=0;i<3;i++) p.push(HORN(84,40,6,-10+i*25,3,0,c[1],2));
  p.push(...TUBE(CURVE([[108,74],[116,68],[122,64],[128,60]],3),o.nw||12,(o.nw||12)*.85,c[0]));
  p.push(...head(128,58,o.ha??10));
  return {p,sc:o.sc||1,fly:1};
}

/* ---------- plezjozaur ---------- */
function A_plesio(c,o){
  const mid=mix(c[0],c[2],.42),p=[],H={long:[176,38],xlong:[188,22],mid:[160,50],short:[150,60]}[o.nk||'long'];
  p.push(F('M96,90 C90,106 74,118 54,122 C64,106 76,96 90,88 Z',mid),F('M74,90 C70,106 60,118 44,124 C52,106 60,96 68,88 Z',mid));
  p.push(...TUBE(CURVE([[64,82],[44,82],[28,86],[14,90]],3),24,8,c[0]));
  p.push(BL(96,82,o.lg?30:36,o.lg?17:21,c[0]));
  p.push(SHADE('M66,88 C86,100 116,100 128,88 C120,102 76,104 66,88 Z',c[1],.45));
  if(o.lg) p.push(...TAP([[106,90],[114,104],[108,116]],[9,7],c[0]),F('M100,114 L116,114 L118,120 L98,120 Z',c[1],1),
    ...TAP([[80,90],[74,104],[66,114]],[9,7],c[0]),F('M58,112 L72,112 L74,118 L56,118 Z',c[1],1));
  else p.push(F('M110,92 C114,110 104,124 86,130 C92,110 98,98 104,88 Z',c[1]),F('M82,92 C80,110 70,122 52,128 C58,110 66,98 74,88 Z',c[1]));
  p.push(...TUBE(CURVE([[122,72],[142,60],[H[0]-18,H[1]+10],[H[0]-6,H[1]+4]],6),24,13,c[0]));
  p.push(F(`M${H[0]-12},${H[1]-6} C${H[0]+4},${H[1]-11} ${H[0]+(o.lg?24:17)},${H[1]-3} ${H[0]+(o.lg?22:15)},${H[1]+6} C${H[0]+11},${H[1]+13} ${H[0]-6},${H[1]+12} ${H[0]-13},${H[1]+6} Z`,c[0]));
  p.push(...EYE(H[0]+2,H[1]-1,3.8,c[2]),LINE(`M${H[0]-5},${H[1]+8} L${H[0]+(o.lg?20:13)},${H[1]+5}`,2.2),...TEETH(H[0]+2,H[1]+7,H[0]+(o.lg?18:12),H[1]+6,3,4));
  return {p,sc:o.sc||1,water:1};
}

/* ---------- mozazaur / pliozaur (plio) ---------- */
function A_mosa(c,o){
  const mid=mix(c[0],c[2],.42),p=[];
  if(o.plio){
    p.push(F('M104,98 C110,114 100,128 82,132 C88,112 96,100 100,92 Z',mid),F('M70,98 C68,114 58,128 40,132 C48,112 56,100 64,92 Z',mid));
    p.push(...TUBE(CURVE([[52,84],[36,85],[22,88],[10,92]],3),22,9,c[0]));
    p.push(BL(86,86,40,23,c[0]));
    p.push(SHADE('M56,94 C78,106 114,106 126,92 C118,108 66,110 56,94 Z',c[1],.45));
    p.push(F('M114,96 C120,112 112,126 94,132 C100,112 108,102 112,92 Z',c[1]),F('M62,96 C60,112 50,124 32,130 C40,112 48,102 56,92 Z',c[1]));
    p.push(K(PL([[118,78],[134,74]]),32,c[0]));
    const L=o.sn||0;
    p.push(F(`M126,64 C146,56 ${172+L},62 ${190+L},80 C${194+L},90 ${184+L},96 ${170+L},96 C150,96 130,88 124,78 Z`,c[0]));
    p.push(LINE(`M132,84 C152,94 ${174+L},94 ${190+L},84`,2.6),...TEETH(138,88,182+L,86,o.bt?5:7,o.bt?8:5.4));
    p.push(...EYE(140,72,4.4,c[2]));
  } else {
    const L=o.sn||0;
    p.push(F('M28,88 C14,74 6,90 12,106 C20,98 24,92 32,92 Z',c[1]),F('M30,90 C20,104 22,120 34,128 C36,112 32,98 38,94 Z',c[1]));
    p.push(F(`M26,90 C50,68 92,64 130,72 C160,78 ${180+L},82 ${194+L},90 C${178+L},98 156,104 128,104 C90,104 48,106 26,90 Z`,c[0]));
    p.push(SHADE('M46,94 C80,104 130,104 176,94 C150,104 90,108 46,94 Z',c[1],.45));
    p.push(LINE(`M140,86 C160,94 ${180+L},94 ${195+L},90`,2.6),...TEETH(146,89,186+L,90,6));
    p.push(...EYE(158,80,4.2,c[2]));
    if(o.fin) p.push(TRI([60,76],[48,62],[76,72],c[1],1));
    p.push(F('M96,100 C100,114 92,126 76,130 C82,112 88,104 92,98 Z',c[1]),F('M62,98 C62,112 52,122 36,128 C44,110 52,102 58,96 Z',mid));
  }
  return {p,sc:o.sc||1,water:1};
}

/* ---------- ichtiozaur: ey wielkie oko ---------- */
function A_ichthyo(c,o){
  const mid=mix(c[0],c[2],.42),p=[];
  p.push(F('M34,84 C20,66 8,66 6,76 C14,82 24,86 30,90 Z',c[1]),F('M32,88 C18,96 8,106 10,116 C20,108 28,100 36,94 Z',c[1]));
  p.push(F('M30,86 C52,64 96,60 132,68 C158,74 178,82 192,88 C178,94 158,100 132,102 C96,106 52,104 30,86 Z',c[0]));
  p.push(SHADE('M50,92 C86,102 138,100 180,90 C150,100 92,104 50,92 Z',c[1],.45));
  if(!o.nofin) p.push(TRI([96,64],[108,44],[118,66],c[1]));
  p.push(F('M104,98 C108,112 100,122 86,126 C90,110 96,102 100,96 Z',c[1]),F('M74,96 C74,110 66,120 52,124 C58,108 64,100 70,94 Z',mid));
  p.push(F('M152,78 C170,78 186,82 197,88 C187,92 168,94 154,92 Z',c[0]),LINE('M146,86 C164,92 184,92 197,88',2.4));
  p.push(...TEETH(156,89,188,89,4,3.5),...EYE(144,80,5*(o.ey||1),c[2]));
  return {p,sc:o.sc||1,water:1};
}

/* ---------- ryby: shark, dunk (pancerna), leeds (filtrator), helico (spirala zębów) ---------- */
function A_fish(c,o){
  const p=[],ink=c[2],k=o.k||'dunk';
  if(k==='shark'||k==='helico'){
    p.push(F('M20,60 C34,74 34,92 22,106 C42,96 54,88 60,82 C52,74 38,66 20,60 Z',c[0]));
    p.push(F('M40,82 C60,56 106,50 142,58 C168,64 186,76 196,86 C182,94 160,102 134,104 C98,106 58,98 40,82 Z',c[0]));
    p.push(SHADE('M60,90 C96,102 146,100 190,90 C158,100 100,104 60,90 Z','#fff',.75));
    p.push(TRI([96,52],[112,28],[124,56],c[0]),F('M112,98 C118,114 108,126 90,128 C98,110 106,102 110,96 Z',c[0]));
    for(let i=0;i<5;i++)p.push(LINE(`M${86+i*7},76 C${84+i*7},82 ${84+i*7},87 ${86+i*7},93`,2));
    p.push(...EYE(146,74,4.6,ink));
    if(k==='shark') p.push(LINE('M144,84 C164,92 186,92 196,86',3),...TEETH(150,87,190,88,7));
    else{p.push(LINE('M150,88 C166,92 184,92 196,86',2.6),BL(166,100,15,15,c[1],1));
      let d='';for(let i=0;i<=40;i++){const a=i/40*PI*3.4,r=13-i*.28;d+=(i?' L':'M')+P(166+Math.cos(a)*r,100+Math.sin(a)*r);}p.push(LINE(d,1.8));
      for(let i=0;i<10;i++){const a=(-100+i*36)*PI/180;p.push(TRI([166+Math.cos(a-.2)*14,100+Math.sin(a-.2)*14],[166+Math.cos(a)*21,100+Math.sin(a)*21],[166+Math.cos(a+.2)*14,100+Math.sin(a+.2)*14],'#fff',1));}}
  } else if(k==='leeds'){
    p.push(F('M8,56 C22,72 22,96 8,112 C30,100 44,92 52,86 C44,76 30,64 8,56 Z',c[1]));
    p.push(F('M40,84 C56,62 100,56 140,60 C158,62 174,62 184,66 C194,70 197,80 196,88 C195,98 190,106 180,108 C166,112 150,112 130,112 C90,112 56,104 40,84 Z',c[0]));
    p.push(F('M150,72 C166,66 186,70 190,86 C188,100 168,106 150,100 C144,92 144,80 150,72 Z',mix(c[2],c[0],.35),2));
    for(let i=0;i<5;i++)p.push(LINE(`M${157+i*6},${72+i*.4} L${157+i*6},${100-i*.8}`,1.8));
    p.push(SHADE('M56,92 C90,104 130,106 150,100 C130,110 90,110 56,92 Z',c[1],.6));
    p.push(F('M120,98 C136,110 138,126 124,136 C120,120 112,110 106,102 Z',c[1],1),TRI([96,60],[110,44],[118,60],c[0]));
    for(let i=0;i<4;i++)p.push(LINE(`M${110+i*8},68 C${106+i*8},80 ${106+i*8},90 ${110+i*8},100`,2));
    p.push(...EYE(142,68,3.4,ink));
  } else {
    p.push(F('M16,74 C30,82 30,100 18,114 C38,104 50,94 56,88 Z',c[1]));
    p.push(F('M34,86 C54,64 92,58 124,64 C150,70 170,78 180,86 C168,94 148,100 122,102 C88,104 52,100 34,86 Z',c[0]));
    p.push(F('M96,100 C100,114 90,124 74,126 C82,110 88,102 92,98 Z',c[1]));
    p.push(F('M118,62 C146,60 178,70 192,86 C178,98 148,104 120,102 C110,96 108,68 118,62 Z',c[1],1));
    for(let i=0;i<3;i++)p.push(LINE(`M${132+i*16},68 C${128+i*16},80 ${128+i*16},90 ${134+i*16},98`,2.2));
    p.push(F('M148,82 C166,79 184,81 192,85 C180,89 162,91 148,88 Z','#EFE6D2',2),F('M150,91 C166,94 182,91 190,87 C180,96 164,98 150,95 Z','#EFE6D2',2));
    p.push(LINE('M156,87 L160,94 L165,87 L170,94 L175,87',2),...EYE(132,78,4.6,ink));
  }
  return {p,sc:o.sc||1,water:1};
}

/* ---------- wieloryby: sperm (Liwiatan, wielka głowa) i eel (Bazylozaur, wężowy) ---------- */
function A_whale(c,o){
  const p=[],mid=mix(c[0],c[2],.4);
  if(o.k==='eel'){
    const Q1=[[10,62],[34,40],[60,96],[88,78]],Q2=[[88,78],[112,62],[132,98],[160,80]],pts=[...CURVE(Q1,10),...CURVE(Q2,10).slice(1)];
    p.push(F('M14,64 C4,50 2,44 6,40 C10,48 14,54 18,58 Z',c[1],1),F('M12,62 C0,68 -2,76 2,80 C6,72 10,68 16,66 Z',c[1],1));
    p.push(...TUBE(pts,t=>5+Math.sin(Math.min(1,t*1.3)*PI*.5)*16,0,c[0]));
    p.push(F('M146,92 C150,102 146,110 138,112 C140,104 140,98 142,92 Z',c[1]),F('M84,88 C86,94 84,98 80,99 C80,95 80,92 81,89 Z',c[1]));
    p.push(F('M152,72 C166,66 184,70 196,78 C188,86 170,90 156,90 Z',c[0]));
    p.push(LINE('M158,82 C172,84 186,82 196,78',2.2),...TEETH(164,83,192,80,4,4.5),...EYE(164,74,3.8,c[2]));
    return {p,sc:o.sc||1,water:1};}
  p.push(F('M44,82 C34,70 26,56 12,44 C24,46 30,50 36,56 C34,46 36,38 40,32 C46,48 50,62 56,78 Z',c[1],1));
  p.push(F('M46,84 C66,64 110,52 150,50 C176,48 196,56 196,72 L196,84 C176,86 150,86 130,90 C110,102 76,104 46,84 Z',c[0]));
  p.push(F('M196,86 C180,98 150,102 124,96 C140,92 170,88 196,86 Z',c[0]));
  p.push(SHADE('M64,90 C90,100 116,98 128,94 C112,104 80,104 64,90 Z',c[1],.6));
  p.push(...TEETH(136,87,192,85,6,7),...TEETH(136,95,188,89,5,-7));
  p.push(F('M104,94 C112,106 106,116 92,120 C96,110 96,100 98,94 Z',mid),...EYE(148,66,3.8,c[2]));
  return {p,sc:o.sc||1,water:1};
}

/* ---------- krokodylomorfy i jaszczury: up wyprostowane nogi, liz jaszczurka, nkl długa szyja ---------- */
function A_croc(c,o){
  const mid=mix(c[0],c[2],.4),up=o.up,liz=o.liz,p=[],nkl=o.nkl||0;
  p.push(...TAP(up?[[64,98],[66,113],[64,124]]:[[62,100],[54,112],[46,120]],[16,13],mid));
  p.push(...TAP(up?[[120,98],[122,113],[120,124]]:[[118,100],[126,112],[134,120]],[16,13],mid));
  p.push(...TUBE(CURVE([[44,94],[30,96],[18,100],[4,104]],4),20,liz?5:9,c[0]));
  if(!liz)for(let i=0;i<4;i++)p.push(TRI([12+i*9,96-i],[16+i*9,86-i],[22+i*9,96-i],c[1]));
  p.push(F(up?'M40,88 C42,68 70,60 102,62 C132,64 150,74 152,90 C154,104 118,108 88,106 C58,104 38,102 40,88 Z'
    :'M36,94 C38,78 70,70 104,72 C134,74 152,80 156,90 C158,102 118,106 90,104 C56,102 34,104 36,94 Z',c[0]));
  if(!liz)for(let i=0;i<6;i++)p.push(SHADE(`M${48+i*17},${up?64:74} L${54+i*17},${up?55:65} L${60+i*17},${up?65:75} Z`,mix(c[1],c[2],.15),.8));
  else for(let i=0;i<7;i++)p.push(SHADE(EP(52+i*14,up?74:82,4,3),mix(c[1],c[2],.1),.8));
  let sx=up?150:154,sy=up?80:84;const SL=o.sn||(up?32:42),HD=o.hh||1;
  if(nkl||liz){const N=[[146,84],[146+nkl*.4,80-nkl*.3],[146+nkl*.8,78-nkl*.35],[150+nkl,78-nkl*.3]];
    p.push(...TUBE(CURVE(N,6),16,11,c[0]));sx=N[3][0]+4;sy=N[3][1];}
  p.push(F(`M${sx-8},${sy-11*HD} C${sx+SL*.4},${sy-17*HD} ${sx+SL},${sy-11} ${sx+SL+3},${sy-2} C${sx+SL},${sy+9} ${sx+SL*.4},${sy+11*HD} ${sx-8},${sy+9*HD} Z`,c[0]));
  if(o.bulla) p.push(BL(sx+SL-2,sy-6,8,6,c[0]));
  p.push(LINE(`M${sx-2},${sy+1} C${sx+SL*.5},${sy+7} ${sx+SL*.8},${sy+6} ${sx+SL+2},${sy-1}`,2.4));
  if(liz) p.push(STRIPE(`M${sx+SL+2},${sy-1} L${sx+SL+12},${sy+1} M${sx+SL+10},${sy+1} L${sx+SL+15},${sy-2} M${sx+SL+10},${sy+1} L${sx+SL+15},${sy+4}`,TONGUE,2.2,1));
  else p.push(...TEETH(sx+4,sy+4,sx+SL-2,sy+2,Math.max(3,Math.round(SL/8)),o.bt?7:5.4));
  if(o.tsk) p.push(HORN(sx+SL*.55,sy-4,13,-80,5,3,IVORY),HORN(sx+SL*.6,sy+6,14,85,5,-3,IVORY),HORN(sx+SL*.25,sy+6,10,95,4,-2,IVORY));
  if(o.brow) p.push(BL(sx-2,sy-12*HD,6,4,c[1],1));
  p.push(...EYE(sx,sy-7*HD,4.2,c[2]));
  if(up){p.push(...TAP([[74,98],[76,113],[74,124]],[18,15],c[0]),...TAP([[128,98],[130,113],[128,124]],[18,15],c[0]));
    p.push(F('M66,124 L88,124 L88,130 L66,130 Z',c[0]),F('M120,124 L142,124 L142,130 L120,130 Z',c[0]));}
  else{p.push(...TAP([[72,100],[64,112],[56,120]],[18,14],c[0]),...TAP([[126,100],[134,112],[142,120]],[18,14],c[0]));
    p.push(FOOT(48,126,3,c[0]),FOOT(134,126,3,c[0]));}
  return {p,sc:o.sc||1};
}

/* ---------- wąż (Tytanoboa) ---------- */
function A_snake(c,o){
  const p=[],Q1=[[6,108],[30,136],[62,86],[96,110]],Q2=[[96,110],[128,134],[150,118],[158,78]],pts=[...CURVE(Q1,10),...CURVE(Q2,10).slice(1)];
  p.push(...TUBE(pts,t=>3+Math.sin(Math.min(1,t*1.6)*PI*.5)*20-(t>.8?(t-.8)*20:0),0,c[0]));
  for(let i=3;i<pts.length-2;i+=2){const [x,y]=pts[i];p.push(SHADE(EP(x,y-2,5,3.5),mix(c[1],c[2],.15),.8));}
  p.push(F('M148,70 C152,58 170,56 184,62 C194,66 196,74 188,78 C176,84 156,84 150,78 Z',c[0]));
  p.push(LINE('M160,77 C170,78 180,77 190,74',2),STRIPE('M190,74 L200,76 M198,76 L203,72 M198,76 L203,80',TONGUE,2.2,1),...EYE(170,66,3.8,c[2]));
  return {p,sc:o.sc||1};
}

/* ---------- żaglowiec (dimetrodon, edafozaur) ---------- */
function A_sail(c,o){
  const mid=mix(c[0],c[2],.4),top=o.short?32:14,p=[];
  p.push(...TAP([[66,100],[58,112],[50,120]],[15,12],mid),...TAP([[120,100],[128,112],[136,120]],[15,12],mid));
  p.push(...TUBE(CURVE([[48,96],[34,98],[22,100],[8,104]],3),19,8,c[0]));
  const TOP=[[56,86],[64,top],[130,top],[140,86]],BOT=[[140,86],[116,70],[80,70],[56,86]];
  p.push(F(`M56,86 C64,${top} 130,${top} 140,86 C116,70 80,70 56,86 Z`,c[1],1));
  for(let i=1;i<9;i++){const t=i/9,a=CB(TOP,t),b=CB(BOT,1-t);p.push(LINE(PL([[b[0],b[1]-2],[a[0],a[1]+9]]),2.6));
    if(o.short)for(const u of [.42,.78])p.push(SHADE(EP(b[0]+(a[0]-b[0])*u,b[1]-2+(a[1]+11-b[1])*u,3.8,3.4),mix(c[1],c[2],.6),1));}
  p.push(F('M44,96 C46,80 74,72 102,74 C128,76 144,82 148,92 C150,102 118,106 92,104 C62,102 42,104 44,96 Z',c[0]));
  p.push(F(o.short?'M144,84 C156,80 172,84 176,92 C178,99 170,102 160,100 C150,98 145,92 144,88 Z'
    :'M144,82 C162,76 180,82 188,92 C190,99 180,104 168,102 C154,100 145,92 144,88 Z',c[0]));
  if(o.short) p.push(LINE('M150,92 C158,96 168,96 176,92',2.2),...EYE(156,86,4,c[2]));
  else p.push(LINE('M148,90 C162,97 180,97 188,92',2.4),{d:'M160,92 L163,105 L168,92 Z',f:'#fff',m:2,sw:1.5},...TEETH(146,92,176,92,4),...EYE(154,84,4.2,c[2]));
  p.push(...TAP([[76,98],[68,112],[60,120]],[18,15],c[0]),...TAP([[130,98],[138,112],[146,120]],[18,15],c[0]));
  p.push(FOOT(52,126,3,c[0]),FOOT(138,126,3,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- synapsydy czworonożne: dicy (dziób+kły), thick (moschops), gorgon (szablozęby gad) ---------- */
function A_synap(c,o){
  const mid=mix(c[0],c[2],.4),p=[],hk=o.hd||'dicy',sl=o.sl||0,gor=hk==='gorgon',up=o.up||gor;
  const leg=(x,y,w,f)=>up?LEG4(x,y,w,f,'paw'):[...TAP([[x,y],[x+(x<96?-8:8),y+14],[x+(x<96?-14:14),124]],[w,w*.8],f),FOOT(x+(x<96?-20:10),128,3,f)];
  p.push(...leg(70,98,16,mid),...leg(114,96-sl*.4,16,mid));
  p.push(...TUBE(CURVE(gor?[[56,88],[36,90],[20,98],[6,106]]:[[56,90],[46,92],[40,96],[34,98]],4),gor?16:18,gor?4:10,c[0]));
  p.push(BL(90,88,o.bw||42,25,c[0],0,-sl));
  if(hk==='thick') p.push(BL(112,74,26,20,c[0],0,-20));
  p.push(SHADE('M60,96 C82,110 114,110 128,96 C120,112 72,114 60,96 Z',c[1],.45));
  const hy=(hk==='thick'?64:76)-sl*.3;
  p.push(K(PL([[124,hy+8],[138,hy+4]]),hk==='thick'?30:26,c[0]));
  if(hk==='gorgon'){
    p.push(F(`M130,${hy-4} C146,${hy-12} 174,${hy-6} 188,${hy+6} C192,${hy+12} 186,${hy+16} 176,${hy+16} C158,${hy+18} 138,${hy+16} 128,${hy+8} Z`,c[0]));
    p.push(LINE(`M140,${hy+10} C156,${hy+14} 174,${hy+14} 188,${hy+10}`,2.2),HORN(170,hy+12,20,96,6,-3,IVORY),...TEETH(144,hy+12,164,hy+13,3),...EYE(150,hy+2,4,c[2]));
  } else if(hk==='thick'){
    p.push(F(`M128,${hy-8} C142,${hy-18} 164,${hy-12} 170,${hy+4} C174,${hy+16} 166,${hy+24} 152,${hy+24} C138,${hy+24} 126,${hy+12} 126,${hy} Z`,c[0]));
    p.push(SHADE(EP(146,hy-8,14,6,-10),c[1],.7),LINE(`M150,${hy+18} C158,${hy+20} 164,${hy+18} 168,${hy+14}`,2.2),...EYE(148,hy+2,4,c[2]));
  } else {
    p.push(F(`M128,${hy-6} C146,${hy-14} 168,${hy-6} 176,${hy+8} C180,${hy+18} 170,${hy+24} 156,${hy+22} C140,${hy+20} 128,${hy+12} 126,${hy+4} Z`,c[0]));
    p.push(F(`M162,${hy+8} C176,${hy+6} 180,${hy+16} 170,${hy+22} C164,${hy+22} 160,${hy+16} 162,${hy+10} Z`,mix(c[1],c[2],.35),2));
    p.push(HORN(156,hy+16,o.tl||14,98,6,-2,IVORY),...EYE(144,hy+4,4.2,c[2]));
  }
  p.push(...leg(82,96,19,c[0]),...leg(124,94-sl*.4,19,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- płazy: bok (eryops, metopo) albo widok z góry z głową-bumerangiem (boom) ---------- */
function A_amphib(c,o){
  const mid=mix(c[0],c[2],.4),p=[];
  if(o.boom){
    p.push(...[[70,58,-1],[70,82,1],[112,58,-1],[112,82,1]].map(([x,y,s])=>K(PL([[x,y],[x+(x<90?-10:6),y+s*16],[x+(x<90?-18:12),y+s*20]]),8,x<90?mid:c[0])).flat());
    p.push(...TUBE(CURVE([[60,70],[40,70],[24,72],[6,70]],4),16,3,c[0]),F('M52,70 C40,62 24,64 8,70 C24,76 40,78 52,70 Z',c[1],1));
    p.push(BL(94,70,40,15,c[0]));
    p.push(SHADE(EP(96,70,30,5),c[1],.5));
    p.push(F('M180,70 C180,52 152,34 116,20 C134,40 140,54 136,62 L136,78 C140,86 134,100 116,120 C152,106 180,88 180,70 Z',c[0]));
    p.push(SHADE('M170,70 C168,56 148,42 128,32 C142,46 146,58 144,66 Z',c[1],.55));
    p.push(...EYE(162,64,3.8,c[2]),...EYE(162,77,3.8,c[2]));
    return {p,sc:o.sc||1};}
  const fl=o.flat?4:0;
  p.push(K(PL([[70,110],[58,120],[46,126]]),13,mid),K(PL([[124,110],[136,120],[148,126]]),13,mid));
  p.push(...TUBE(CURVE([[52,100],[36,102],[22,106],[8,110]],3),20,6,c[0]));
  p.push(BL(94,100+fl/2,48,22-fl,c[0]));
  p.push(SHADE('M56,108 C84,118 116,118 136,106 C124,120 68,122 56,108 Z',c[1],.45));
  p.push(K(PL([[136,96+fl],[146,96+fl]]),26-fl,c[0]));
  p.push(F(o.flat?'M136,94 C158,88 188,94 196,104 C190,112 158,114 134,110 Z':'M138,88 C158,82 184,90 192,102 C188,112 156,114 136,108 Z',c[0]));
  p.push(LINE(o.flat?'M142,106 C164,110 184,110 196,104':'M144,104 C162,110 182,110 192,102',2.4),...TEETH(150,106,186,106,5,4));
  p.push(...EYE(o.flat?168:156,o.flat?96:94,4.4,c[2]));
  if(!o.flat) p.push(...EYE(176,96,3.8,c[2]));
  p.push(K(PL([[68,104],[56,96],[44,92]]),12,c[0]),K(PL([[122,104],[134,96],[146,92]]),12,c[0]));
  return {p,sc:o.sc||1};
}

/* ---------- stawonogi i mięczaki (widok z góry / z boku) ---------- */
function A_bug(c,o){
  const p=[],ink=c[2],k=o.k;
  if(k==='dragon'){
    p.push(F('M96,66 C72,46 40,34 10,38 C34,54 62,70 92,78 Z',c[1],1),F('M104,68 C128,48 162,38 192,44 C168,60 134,74 106,80 Z',c[1],1));
    p.push(F('M94,80 C70,76 42,80 20,92 C46,94 72,92 94,88 Z',mix(c[1],'#ffffff',.28),1),F('M104,82 C128,78 158,82 182,94 C156,96 126,94 104,90 Z',mix(c[1],'#ffffff',.28),1));
    p.push(F('M92,68 C97,58 105,58 110,68 C114,88 111,114 102,130 C95,112 88,86 92,68 Z',c[0]));
    for(let i=0;i<4;i++)p.push(LINE(`M95,${88+i*10} L108,${88+i*10}`,2));
    p.push(BL(93,60,8,8,c[0]),BL(109,60,8,8,c[0]),SHADE(EP(92,58,3.2,3.2),'#fff',.9),SHADE(EP(110,58,3.2,3.2),'#fff',.9));
    return {p,sc:o.sc||1,fly:1};}
  if(k==='milli'){
    for(let i=0;i<11;i++){const x=24+i*15,y=88+Math.sin(i*.55)*11;p.push(K(PL([[x,y+12],[x-4,y+26]]),6,mix(c[0],c[2],.3)));}
    for(let i=0;i<11;i++){const x=24+i*15,y=88+Math.sin(i*.55)*11;
      p.push(F(`M${x-7},${y-15} C${x+7},${y-17} ${x+9},${y+13} ${x-7},${y+15} Z`,i%2?c[0]:mix(c[0],c[1],.35),1));}
    p.push(BL(184,88+Math.sin(11*.55)*11,15,16,c[1]),...EYE(188,84,3.8,ink),K(PL([[192,78],[199,68]]),3,ink),K(PL([[191,94],[199,88]]),3,ink));
    return {p,sc:o.sc||1};}
  /* trylobit z góry, głowa w prawo */
  p.push(TRI([150,34],[92,26],[140,46],c[1],1),TRI([150,106],[92,114],[140,94],c[1],1));
  p.push(F('M48,70 C48,46 60,40 76,40 L146,40 L146,100 L76,100 C60,100 48,94 48,70 Z',c[0]));
  for(let i=0;i<8;i++)p.push(LINE(`M${66+i*10},42 C${64+i*10},56 ${64+i*10},84 ${66+i*10},98`,2.2));
  p.push(F('M60,70 C60,60 70,58 80,58 L148,58 L148,82 L80,82 C70,82 60,80 60,70 Z',c[1],1));
  p.push(F('M144,30 C184,30 196,56 196,70 C196,84 184,110 144,110 C138,96 138,44 144,30 Z',c[0]));
  p.push(F('M150,58 C164,56 180,62 184,70 C180,78 164,84 150,82 Z',c[1],1));
  p.push(F('M160,42 C168,40 174,44 172,50 C166,50 162,48 160,42 Z',ink,2),F('M160,98 C168,100 174,96 172,90 C166,90 162,92 160,98 Z',ink,2));
  return {p,sc:o.sc||1};
}
function A_ammo(c,o){
  const p=[],cx=84,cy=64,R0=50,rr=t=>R0*.94*Math.exp(-.2*t);
  for(let i=0;i<6;i++)p.push(K(`M128,${92+i*3} C${146+i*3},${88+i*6} ${160+i*4},${96+i*7} ${172+i*3-(i%2)*8},${108+i*5}`,5,mix(c[0],c[1],.4)));
  p.push(F('M116,78 C134,72 152,80 150,98 C148,112 124,116 112,106 Z',c[1]),...EYE(134,90,4.4,c[2]));
  p.push(BL(cx,cy,R0,R0,c[0]));
  let d='';for(let i=0;i<=90;i++){const t=i/90*12.5,r=rr(t);d+=(i?' L':'M')+P(cx+Math.cos(t)*r,cy+Math.sin(t)*r);}
  for(let i=0;i<30;i++){const t=i*.3,r1=rr(t),r2=rr(t+2*PI);if(r2<5)break;p.push(STRIPE(PL([[cx+Math.cos(t)*r1*.97,cy+Math.sin(t)*r1*.97],[cx+Math.cos(t)*r2*1.03,cy+Math.sin(t)*r2*1.03]]),c[1],3,.8));}
  p.push(LINE(d,2.6));
  return {p,sc:o.sc||1,water:1};
}
/* skorpion morski (eurypteryd) z góry */
function A_scorp(c,o){
  const p=[],mid=mix(c[0],c[2],.35),Y=70;
  for(const s of [-1,1]){p.push(...TAP([[150,Y+s*14],[172,Y+s*26],[186,Y+s*34]],[8,6],mid),F(`M178,${Y+s*30} L200,${Y+s*38} L186,${Y+s*42} Z`,c[1],1),F(`M180,${Y+s*36} L198,${Y+s*50} L184,${Y+s*48} Z`,c[1],1));
    p.push(...TAP([[136,Y+s*16],[118,Y+s*36],[104,Y+s*52]],[7,6],mid),BL(100,Y+s*56,12,7,c[1],1,s*30));
    for(let i=0;i<3;i++)p.push(K(PL([[140+i*6,Y+s*16],[146+i*8,Y+s*28]]),3,mid));}
  p.push(TRI([30,Y-5],[2,Y],[30,Y+5],c[1],1));
  for(let i=11;i>=0;i--){const x=40+i*8.4,w=8+i*1.6;p.push(BL(x,Y,6,w,i%2?c[0]:mix(c[0],c[1],.3),1));}
  p.push(F(`M136,${Y-24} C160,${Y-28} 176,${Y-18} 178,${Y} C176,${Y+18} 160,${Y+28} 136,${Y+24} Z`,c[0]));
  p.push(F(`M160,${Y-16} C168,${Y-18} 172,${Y-12} 168,${Y-8} C164,${Y-8} 160,${Y-10} 160,${Y-16} Z`,c[2],2),F(`M160,${Y+16} C168,${Y+18} 172,${Y+12} 168,${Y+8} C164,${Y+8} 160,${Y+10} 160,${Y+16} Z`,c[2],2));
  return {p,sc:o.sc||1,water:1};
}
/* anomalokaris z góry */
function A_anomalo(c,o){
  const p=[],Y=70,mid=mix(c[0],c[2],.3);
  for(const s of [-1,1]) for(let i=0;i<3;i++) p.push(BL(34-i*4,Y+s*(6+i*7),16,5,c[1],1,s*(20+i*18)));
  for(let i=10;i>=0;i--){const x=48+i*10,w=10+Math.sin((i+2)/13*PI)*14;
    for(const s of [-1,1])p.push(BL(x-2,Y+s*w,10,8,i%2?c[1]:mix(c[1],c[0],.3),1,s*-25));}
  p.push(BL(100,Y,58,13,c[0]));
  for(let i=0;i<9;i++)p.push(LINE(`M${56+i*10},${Y-10} L${56+i*10},${Y+10}`,1.6));
  for(const s of [-1,1]){p.push(...TUBE(CURVE([[170,Y+s*6],[194,Y+s*4],[202,Y+s*26],[184,Y+s*28]],7),8,5,mid),
    ...SPINES([[170,Y+s*6],[194,Y+s*4],[202,Y+s*26],[184,Y+s*28]],6,6,3,c[1],{side:-s,t0:.2,t1:.95,m:1}));
    p.push(K(PL([[160,Y+s*8],[164,Y+s*22]]),5,c[0]),BL(164,Y+s*26,7,6,c[2],2));}
  p.push(BL(162,Y,16,13,c[0]));
  return {p,sc:o.sc||1,water:1};
}

/* ---------- ssaki czworonożne: hd = cat|dog|bear|rhino|deer|ele|indri|andrew|diproto ---------- */
function A_mammal(c,o){
  const mid=mix(c[0],c[2],.4),p=[],hd=o.hd||'cat',lh=o.lh||30,rx=o.bw||40,ry=o.bh||22,G=130,
    bx=96,by=G-lh-ry*.55,lw=o.lw||14,ft=o.ft||'paw',hock=o.hock,
    S=[bx+rx*.7,by-ry*.3],nk=o.nk||[22,-10],H=[S[0]+nk[0],S[1]+nk[1]],[x,y]=H,iv=IVORY;
  const legs=(f,d,w)=>[...LEG4(bx-rx*.62+d,by+ry*.2,w,f,ft,hock),...LEG4(bx+rx*.55+d,by+ry*.2,w,f,ft)];
  p.push(...legs(mid,-6,lw*.95));
  const TQ=[[bx-rx*.9,by-ry*.3],[bx-rx-14,by-ry*.4],[bx-rx-24,by+4],[bx-rx-26,by+22]];
  if(o.tail==='tuft') p.push(...TUBE(CURVE(TQ,5),6,4,c[0]),BL(TQ[3][0],TQ[3][1]+3,5,7,mix(c[0],c[2],.5)));
  else if(o.tail==='bush') p.push(VANE(TQ,0,9,c[0],0),SHADE(EP(TQ[3][0]+1,TQ[3][1]-3,3,5),c[1],.8));
  else if(o.tail==='long') p.push(...TUBE(CURVE([[bx-rx*.9,by-ry*.2],[bx-rx-16,by-ry*.3],[bx-rx-30,by+2],[bx-rx-40,by+18]],5),9,4,c[0]));
  else if(o.tail!=='none') p.push(...TUBE(CURVE([[bx-rx*.9,by-ry*.2],[bx-rx-6,by-ry*.1],[bx-rx-10,by+2],[bx-rx-12,by+10]],3),7,4,c[0]));
  /* rogi/poroże dalsze (za głową) */
  if(hd==='deer') p.push(K(`M${P(x-2,y-8)} C${P(x+10,y-30)} ${P(x+30,y-44)} ${P(x+50,y-44)}`,5,mid),VANE([[x-2,y-10],[x+10,y-30],[x+30,y-44],[x+50,y-44]],.35,9,mid,0),
    ...SPINES([[x-2,y-10],[x+10,y-30],[x+30,y-44],[x+50,y-44]],4,9,5,mid,{t0:.3,t1:1}));
  p.push(BL(bx,by,rx,ry,c[0],0,o.rot||0));
  if(o.hump) p.push(BL(bx+rx*.4,by-ry*.4,rx*.52,ry*.8,c[0],0,-12));
  if(o.fur) p.push(...SPINES([[bx+rx*.8,by+ry*.6],[bx+rx*.3,by+ry*1.25],[bx-rx*.4,by+ry*1.25],[bx-rx*.9,by+ry*.5]],9,9,9,c[0],{side:-1,t0:.05,t1:.95,tilt:-2}),
    ...[0,1,2,3,4,5,6].map(i=>LINE(PL([[bx-rx*.7+i*rx*.23,by+ry*.2+(i%2)*4],[bx-rx*.74+i*rx*.23,by+ry*.2+(i%2)*4+10]]),2)));
  if(o.stripe) for(let i=0;i<5;i++)p.push(STRIPE(`M${P(bx-rx*.5+i*rx*.24,by-ry*.9)} L${P(bx-rx*.55+i*rx*.24,by-ry*.2)}`,c[2],4,.35));
  p.push(SHADE(`M${P(bx-rx*.75,by+ry*.4)} C${P(bx-rx*.3,by+ry*1.2)} ${P(bx+rx*.4,by+ry*1.2)} ${P(bx+rx*.85,by+ry*.3)} C${P(bx+rx*.4,by+ry*.9)} ${P(bx-rx*.3,by+ry*.9)} ${P(bx-rx*.75,by+ry*.4)} Z`,c[1],.45));
  p.push(...TUBE(CURVE([S,[S[0]+nk[0]*.3,S[1]+nk[1]*.6],[S[0]+nk[0]*.7,S[1]+nk[1]],H],4),o.nw||ry*1.15,(o.nw||ry*1.15)*.8,c[0]));
  if(o.fur) p.push(...SPINES([S,[S[0]+nk[0]*.3,S[1]+nk[1]*.6+14],[x,y+18],[x+4,y+14]],4,8,8,c[0],{side:-1,t0:.2,t1:.9}));
  const ear=(ex,ey,r,pt)=>pt?TRI([ex-5,ey+4],[ex-2,ey-r*1.8],[ex+5,ey+3],c[0]):BL(ex,ey,r,r,c[0]);
  if(hd==='cat'||hd==='bear'||hd==='dog'){const big=hd==='bear'?1.12:1;
    p.push(ear(x-5,y-11*big,hd==='dog'?6:4.5,hd==='dog'),ear(x+3,y-12*big,hd==='dog'?6:4.5,hd==='dog'));
    p.push(BL(x,y,14*big,12*big,c[0]));
    if(hd==='dog') p.push(...TAP([[x+6,y+2],[x+24,y+5]],[13],c[0]));
    else p.push(BL(x+12*big,y+4*big,9*big,7.5*big,c[0]));
    const nx=hd==='dog'?x+30:x+20*big,ny=hd==='dog'?y+2:y+1*big;
    p.push(F(`M${P(nx-4,ny-2)} L${P(nx+1,ny-2)} L${P(nx-1,ny+2)} Z`,c[2],2),SHADE(EP(x+10,y+6,7,4.5),c[1],.6));
    p.push(LINE(`M${P(nx-2,ny+6)} C${P(nx-6,ny+9)} ${P(nx-10,ny+9)} ${P(nx-14,ny+6)}`,2),...EYE(x+5,y-3,3.8,c[2]));
    if(o.sab) p.push(HORN(x+11,y+8,22,95,6,-4,iv),HORN(x+17,y+8,20,92,5,-4,iv));
  }
  if(hd==='rhino'||hd==='indri'||hd==='deer'){const L=hd==='deer'?24:hd==='indri'?32:38;
    if(hd==='deer') p.push(K(`M${P(x-4,y-8)} C${P(x-14,y-30)} ${P(x-34,y-42)} ${P(x-54,y-40)}`,5,c[1],1),VANE([[x-4,y-10],[x-14,y-30],[x-34,y-42],[x-54,y-40]],.35,10,c[1]),...SPINES([[x-4,y-10],[x-14,y-30],[x-34,y-42],[x-54,y-40]],4,10,5,c[1],{side:-1,t0:.3,t1:1,m:1}));
    p.push(ear(x-4,y-9,6,1),F(`M${P(x-10,y-10)} C${P(x+8,y-12)} ${P(x+L*.8,y+2)} ${P(x+L,y+12)} C${P(x+L+1,y+20)} ${P(x+L*.6,y+22)} ${P(x-2,y+14)} C${P(x-12,y+8)} ${P(x-12,y-4)} ${P(x-10,y-10)} Z`,c[0]));
    p.push(LINE(`M${P(x+L*.6,y+16)} L${P(x+L-2,y+15)}`,2),...EYE(x+4,y-1,3.6,c[2]));
    if(hd==='rhino') p.push(HORN(x+L-4,y+8,36,-62,12,-12,c[1]),HORN(x+L*.55,y+2,16,-80,8,-4,c[1]));
  }
  if(hd==='ele'){const dn=o.tu==='down';
    p.push(BL(x-12,y+4,dn?14:9,dn?19:12,mix(c[0],c[2],.15),1));
    p.push(BL(x,y,18,20,c[0]));
    if(!dn) p.push(BL(x-4,y-16,13,9,c[0]));
    p.push(...TUBE(CURVE([[x+10,y+6],[x+22,y+22],[x+20,y+48],[x+10,y+60]],7),13,7,c[0]));
    p.push(...(dn?TUBE(CURVE([[x+8,y+18],[x+12,y+30],[x+6,y+40],[x-6,y+44]],5),8,4,iv):TUBE(CURVE([[x+12,y+16],[x+20,y+44],[x+46,y+46],[x+48,y+20]],8),9,4,iv)));
    p.push(...EYE(x+6,y-2,3.6,c[2]));
  }
  if(hd==='andrew'){const sk=SKULL(x-10,y-12,46,24,.62,2);
    p.push(ear(x-6,y-12,5,1),F(sk.d,c[0]),LINE(`M${P(x-4,y+4)} C${P(x+14,y+10)} ${P(x+28,y+8)} ${P(x+37,y+4)}`,2.4),
      ...TEETH(x+2,y+6,x+32,y+5,5,5),F(`M${P(x+34,y-4)} L${P(x+37,y-4)} L${P(x+36,y-1)} Z`,c[2],2),...EYE(x+2,y-4,3.8,c[2]));}
  if(hd==='diproto') p.push(ear(x-6,y-14,5),ear(x+2,y-15,5),BL(x+2,y,18,16,c[0]),BL(x+18,y+5,11,11,c[0]),
    F(`M${P(x+22,y-2)} C${P(x+30,y-2)} ${P(x+30,y+6)} ${P(x+24,y+6)} Z`,mix(c[1],c[2],.4),2),LINE(`M${P(x+12,y+13)} L${P(x+24,y+12)}`,2),...EYE(x+6,y-4,3.8,c[2]));
  p.push(...legs(c[0],4,lw));
  return {p,sc:o.sc||1};
}

/* ---------- Megaterium: leniwiec naziemny na tylnych łapach ---------- */
function A_sloth(c,o){
  const mid=mix(c[0],c[2],.4),p=[];
  p.push(...TUBE(CURVE([[80,108],[64,116],[46,124],[30,128]],4),26,8,c[0]));
  p.push(...LEG4(80,104,20,mid,'paw'),K('M104,62 C114,48 124,40 134,30',12,mid));
  for(let i=0;i<3;i++)p.push(HORN(132+i*3,30,12,-20+i*25,4,4,c[1]));
  p.push(BL(92,82,28,38,c[0],0,18));
  p.push(...SPINES([[70,100],[76,112],[96,118],[114,106]],6,8,9,c[0],{side:-1}));
  p.push(SHADE(EP(98,90,14,24,18),c[1],.45));
  p.push(K(PL([[108,40],[112,30]]),20,c[0]),BL(118,26,14,12,c[0]),BL(130,30,8,7,c[0]));
  p.push(F('M134,28 L138,28 L136,32 Z',c[2],2),...EYE(120,22,3.6,c[2]));
  p.push(K('M104,66 C118,58 130,52 144,44',13,c[0]));
  for(let i=0;i<3;i++)p.push(HORN(142+i*3,44,14,20+i*22,4.5,5,c[1]));
  p.push(...LEG4(96,104,24,c[0],'paw'));
  return {p,sc:o.sc||1};
}

/* ---------- żółw ---------- */
function A_turtle(c,o){
  const p=[],ink=c[2],mid=mix(c[0],c[2],.4);
  p.push(F('M110,94 C124,104 134,118 132,128 C118,122 106,110 102,100 Z',mid),F('M72,94 C58,104 48,118 50,128 C64,122 76,110 80,100 Z',mid));
  p.push(F('M118,90 C138,98 154,114 154,128 C136,120 120,106 112,96 Z',c[1]),F('M64,90 C44,98 30,114 30,128 C48,120 62,106 70,96 Z',c[1]));
  p.push(F('M30,76 C38,48 152,48 160,78 C162,96 130,102 96,102 C60,102 28,96 30,76 Z',c[0]));
  p.push(F('M30,76 C38,58 88,52 96,52 C104,52 152,58 160,78 C142,66 118,62 96,62 C72,62 44,66 30,76 Z',mix(c[1],c[2],.1),1));
  for(let i=0;i<5;i++)p.push(LINE(`M${48+i*24},${60+Math.abs(i-2)*3} C${44+i*24},78 ${46+i*24},90 ${52+i*24},${98-Math.abs(i-2)*3}`,2.4));
  p.push(K(PL([[150,80],[160,82]]),24,c[0]),F('M150,72 C170,66 188,76 189,90 C190,102 170,106 158,98 C150,94 146,80 150,76 Z',c[0]));
  p.push(F('M176,86 C189,86 191,96 180,101 C174,101 170,92 174,88 Z',mix(c[1],c[2],.35),2),...EYE(164,82,4.2,ink));
  return {p,sc:o.sc||1,water:1};
}

/* ---------- ptak/pierzasty lotnik (archeopteryks, mikroraptor four=4 skrzydła) ---------- */
function A_bird(c,o){
  const p=[],ink=c[2],mid=mix(c[0],c[2],.4),TQ=[[86,90],[66,98],[44,106],[20,114]];
  p.push(VANE(TQ,.05,12,c[1]),K(PL([[86,90],[66,98],[44,106],[20,114]]),5,c[0]));
  p.push(WINGF([96,76],[20,28],[82,98],5,mid));
  if(o.four) p.push(WINGF([96,98],[40,130],[80,104],4,mid));
  p.push(BL(102,84,25,16,c[0]));
  p.push(WINGF([100,72],[40,4],[76,96],5,c[1]));
  for(let i=0;i<3;i++)p.push(HORN(52+i*5,16+i*4,6,-10,3,2,c[1],2));
  p.push(...TUBE(CURVE([[116,76],[126,66],[134,58],[142,54]],3),16,13,c[0]));
  p.push(F('M140,44 C154,38 170,46 174,58 C176,65 168,69 160,66 C150,63 142,56 140,50 Z',c[0]));
  p.push(...EYE(150,52,4.2,ink),LINE('M154,62 L172,60',2),...TEETH(154,62,170,61,4,3.8));
  p.push(K(PL([[96,96],[98,108],[90,118]]),6,c[0]),K(PL([[108,96],[110,108],[104,120]]),6,c[0]));
  if(o.four) p.push(WINGF([110,98],[76,134],[104,108],4,c[1]));
  return {p,sc:o.sc||1,fly:1};
}

const ARCH={thero:A_thero,sauro:A_sauro,cerat:A_cerat,armor:A_armor,stego:A_stego,ptero:A_ptero,plesio:A_plesio,
  mosa:A_mosa,ichthyo:A_ichthyo,fish:A_fish,whale:A_whale,croc:A_croc,snake:A_snake,sail:A_sail,synap:A_synap,
  amphib:A_amphib,bug:A_bug,ammo:A_ammo,scorp:A_scorp,anomalo:A_anomalo,mammal:A_mammal,sloth:A_sloth,turtle:A_turtle,bird:A_bird};

/* presety: klucz → [archetyp, domyślne opcje]; używane w ART i przy własnych zwierzętach rodzica */
const PRESET={
  thero:['thero',{}],
  raptor:['thero',{hd:'rap',fz:1,wg:1,sick:1,td:-4,lg:1.1,bw:26,bh:16,lw:17,nw:14,vane:[.35,7],arm:14,clw:3,sc:.9}],
  ornimim:['thero',{hd:'beak',bk:.6,nk:[20,-46],nw:11,lg:1.35,bw:28,bh:18,lw:17,arm:16,clw:3,td:4}],
  tbird:['thero',{hd:'bird',bk:.8,tail:'fan',lg:1.4,nk:[14,-40],nw:15,bw:26,bh:20,lw:15,rot:-12,wg:1,arm:10,fz:1}],
  dragon:['thero',{hd:'long',bat:1,spk:1,bull:1,fire:1,spade:1}],
  prosauro:['thero',{hd:'small',herb:1,nk:[30,-48],nw:16,arm:14,thumb:1,bw:30,bh:22,td:14}],
  hadro:['thero',{hd:'duck',bk:.42,herb:1,nk:[26,-24],nw:20,arm:12,lw:22}],
  orni:['thero',{hd:'iguano',bk:.25,herb:1,nk:[24,-24],nw:18,arm:12}],
  dome:['thero',{hd:'dome',herb:1,nk:[24,-22],nw:20,arm:8}],
  sauro:['sauro',{}],cerat:['cerat',{fr:'round',brow:[30,-60],nose:12}],armor:['armor',{club:1,spk:1}],stego:['stego',{ts:4}],
  ptero:['ptero',{cr:'back',bk:1}],plesio:['plesio',{}],mosa:['mosa',{}],ichthyo:['ichthyo',{}],fish:['fish',{}],
  shark:['fish',{k:'shark'}],whale:['whale',{}],croc:['croc',{}],lizard:['croc',{liz:1,up:1,sn:26}],snake:['snake',{}],
  sail:['sail',{}],synap:['synap',{}],amphib:['amphib',{}],bug:['bug',{}],ammo:['ammo',{}],scorp:['scorp',{}],anomalo:['anomalo',{}],
  mammal:['mammal',{}],ele:['mammal',{hd:'ele',lh:36,lw:20,bw:42,bh:30,nk:[18,-14],ft:'pad',hump:1,tail:'short'}],
  cat:['mammal',{hd:'cat',tail:'tuft',hock:1,lw:12}],sloth:['sloth',{}],bird:['bird',{}],turtle:['turtle',{}],
};
const ARCH_LIST=[['thero','Drapieżnik dwunożny'],['raptor','Pierzasty raptor'],['ornimim','Strusiopodobny dinozaur'],
  ['tbird','Ptak terroru'],['prosauro','Prazauropod'],['sauro','Długoszyi olbrzym (zauropod)'],['cerat','Rogaty z kryzą (ceratops)'],
  ['armor','Pancerny z maczugą'],['stego','Z płytami na grzbiecie'],['hadro','Kaczodzioby'],['orni','Roślinożerca dwunożny'],
  ['dome','Twardogłowy'],['ptero','Pterozaur'],['plesio','Długoszyi gad morski'],['mosa','Morski jaszczur'],['ichthyo','Ichtiozaur'],
  ['shark','Rekin'],['fish','Pancerna ryba'],['whale','Pradawny wieloryb'],['croc','Krokodyl'],['lizard','Jaszczurka'],['snake','Wąż'],
  ['turtle','Żółw'],['sail','Z żaglem (synapsyd)'],['synap','Przodek ssaków'],['amphib','Płaz'],['bug','Trylobit'],['ammo','Amonit'],
  ['scorp','Skorpion morski'],['mammal','Ssak drapieżny'],['cat','Kot szablozęby'],['ele','Mamut / trąbowiec'],['sloth','Leniwiec olbrzymi'],
  ['bird','Pierzasty lotnik'],['dragon','Smok']];

/* ---------- render: kontur → wypełnienia → detale ---------- */
function paint(parts,ink,ghost,z){
  const OL='stroke-linejoin="round" stroke-linecap="round"',W=R(7*z);
  let A='',B='',C='';
  for(const p of parts){if(!p||p.m>=2)continue;
    A+=p.k?`<path d="${p.d}" fill="none" stroke="${ink}" stroke-width="${R(p.k+7*z)}" ${OL}/>`:`<path d="${p.d}" fill="${ink}" stroke="${ink}" stroke-width="${W}" ${OL}/>`;
    if(!ghost)B+=p.k?`<path d="${p.d}" fill="none" stroke="${p.f}" stroke-width="${p.k}" ${OL}/>`:`<path d="${p.d}" fill="${p.f}"/>`;}
  if(ghost) return A;
  for(const p of parts){if(!p)continue;
    if(p.m===1&&!p.k)C+=`<path d="${p.d}" fill="none" stroke="${ink}" stroke-width="${R(2.5*z)}" ${OL}/>`;
    if(p.m===2)C+=`<path d="${p.d}" fill="${p.f||'none'}" stroke="${ink}" stroke-width="${R((p.sw||2.4)*z)}" ${OL}/>`;
    if(p.m===3)C+=`<path d="${p.d}" fill="${p.f}" opacity="${p.op}"/>`;
    if(p.m===4)C+=`<path d="${p.d}" fill="none" stroke="${p.f}" stroke-width="${R(p.sw*z)}" opacity="${p.op}" ${OL}/>`;}
  return A+B+C;
}
/* punkty ścieżki (krzywe próbkowane) — do liczenia obrysu */
function pathPts(d){const t=d.match(/[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/g)||[],o=[];let i=0,c=[0,0],cmd='M';const n=()=>[+t[i++],+t[i++]];
  while(i<t.length){if(/[A-Z]/.test(t[i])){cmd=t[i++];continue;}
    if(cmd==='C'){const q=[c,n(),n(),n()];o.push(...CURVE(q,8));c=q[3];}
    else if(cmd==='Q'){const a=c,b=n(),e=n();for(let s=0;s<=6;s++){const u=s/6,v=1-u;o.push([v*v*a[0]+2*u*v*b[0]+u*u*e[0],v*v*a[1]+2*u*v*b[1]+u*u*e[1]]);}c=e;}
    else{c=n();o.push(c);}}
  return o;}

/* rysuje archetyp/preset z opcjami; skaluje do kadru (margines na kontur), ląd stoi na cieniu */
function drawCustom(arch,opts,mode,pal){
  const [base,def]=PRESET[arch]||(ARCH[arch]?[arch,{}]:PRESET.thero),o={...def,...(opts||{})};
  pal=pal||PAL[o.p??hash(String(arch))%PAL.length]||PAL[0];
  const out=ARCH[base](pal,o),ghost=mode==='ghost';
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const q of out.p){if(!q||q.m===3)continue;const h=q.m>=2?(q.sw||2.4)/2:(q.k||0)/2;
    for(const [x,y] of pathPts(q.d)){x0=Math.min(x0,x-h);y0=Math.min(y0,y-h);x1=Math.max(x1,x+h);y1=Math.max(y1,y+h);}}
  const land=!out.fly&&!out.water,s=Math.min(out.sc||1,186/(x1-x0),(land?124:126)/(y1-y0)),
    dx=100-s*(x0+x1)/2,dy=land?131-s*y1:70-s*(y0+y1)/2,z=Math.min(1/s,1.6);
  const shadow=ghost?'':!land?(out.water?'<g fill="none" stroke="#8FC3D6" stroke-width="3" stroke-linecap="round" opacity=".5"><path d="M14,124 C36,118 56,128 78,122"/><path d="M104,134 C126,128 146,138 168,132"/></g>':'')
    :`<ellipse cx="100" cy="133" rx="${R(Math.min(70,s*(x1-x0)*.36))}" ry="5" fill="rgba(60,40,20,.15)"/>`;
  return `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" class="dsvg">${shadow}`
    +`<g transform="translate(${R(dx)},${R(dy)}) scale(${Math.round(s*1000)/1000})">${paint(out.p,ghost?'#BCAF93':pal[2],ghost,z)}</g></svg>`;
}
/* gatunek po id (ART z artspec.js); obiekt {a,o} = własne zwierzę; nieznane id → teropod w kolorze z hasha */
function drawSpecies(id,mode,palOverride){
  if(id&&typeof id==='object'){if(id.a)return drawCustom(id.a,id.o,mode,palOverride);id=id.id;}
  const spec=(typeof ART!=='undefined'?ART:typeof require!=='undefined'?require('./artspec.js').ART:{})[id];
  return spec?drawCustom(spec[0],spec[1],mode,palOverride):drawCustom('thero',{p:hash(String(id))%PAL.length},mode,palOverride);
}

/* jajo — kolor i grubość skorupy rosną z rzadkością */
const EGG_STYLE = [
  { sh: '#F3E7CE', sp: '#C9B48F', ink: '#6B5B3E', sw: 4, name: 'zwykłe' },
  { sh: '#BFE0C8', sp: '#6FA98A', ink: '#2E5741', sw: 5.5, name: 'mszyste' },
  { sh: '#F6C97A', sp: '#D08A2E', ink: '#5C3B0A', sw: 7, name: 'bursztynowe' },
  { sh: '#E98B7C', sp: '#B23A2E', ink: '#4A150F', sw: 9, name: 'ogniste' },
];
function drawEgg(r, seed) {
  const st = EGG_STYLE[Math.max(0, Math.min(3, (r || 1) - 1))];
  const h = hash(String(seed || 'egg'));
  let dots = '';
  for (let i = 0; i < 9; i++) {
    const a = ((h >> (i * 3)) % 360) * Math.PI / 180;
    const rad = 10 + ((h >> (i * 2)) % 16);
    const x = 50 + Math.cos(a) * rad, y = 60 + Math.sin(a) * rad * 1.25;
    const rr = 2.4 + ((h >> i) % 4);
    dots += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rr}" ry="${(rr * .85).toFixed(1)}" fill="${st.sp}" opacity=".75"/>`;
  }
  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" class="egg-svg">
    <path d="M50,8 C74,8 88,42 88,68 C88,96 71,112 50,112 C29,112 12,96 12,68 C12,42 26,8 50,8 Z"
      fill="${st.sh}" stroke="${st.ink}" stroke-width="${st.sw}" stroke-linejoin="round"/>
    ${dots}
    <path d="M32,32 C28,44 27,56 30,66" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".55"/>
  </svg>`;
}
function drawEggCracked(r, seed) {
  const st = EGG_STYLE[Math.max(0, Math.min(3, (r || 1) - 1))];
  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" class="egg-svg">
    <g class="egg-top"><path d="M50,8 C74,8 88,42 88,64 L70,54 L56,66 L40,52 L26,64 L12,62 C12,40 26,8 50,8 Z"
      fill="${st.sh}" stroke="${st.ink}" stroke-width="${st.sw}" stroke-linejoin="round"/></g>
    <g class="egg-bot"><path d="M12,62 L26,64 L40,52 L56,66 L70,54 L88,64 C88,96 71,112 50,112 C29,112 12,96 12,68 Z"
      fill="${st.sh}" stroke="${st.ink}" stroke-width="${st.sw}" stroke-linejoin="round"/></g>
  </svg>`;
}

if (typeof module !== 'undefined') module.exports = { drawSpecies, drawCustom, drawEgg, drawEggCracked, PAL, ARCH_LIST, PRESET, EGG_STYLE };
