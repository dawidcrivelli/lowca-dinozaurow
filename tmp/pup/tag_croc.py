# Tagowanie regionów wycinanek w A_croc/A_snake/A_sail/A_synap (dokładne podmiany tekstu; błąd gdy brak dopasowania)
import sys
f='js/art.js'; s=open(f).read()
R=[
("  p.push(...TAP(up?[[64,98],[66,113],[64,124]]:[[62,100],[54,112],[46,120]],[16,13],mid));\n  p.push(...TAP(up?[[120,98],[122,113],[120,124]]:[[118,100],[126,112],[134,120]],[16,13],mid));\n  p.push(...TUBE(CURVE([[44,94],[30,96],[18,100],[4,104]],4),20,liz?5:9,c[0]));\n  if(!liz)for(let i=0;i<4;i++)p.push(TRI([12+i*9,96-i],[16+i*9,86-i],[22+i*9,96-i],c[1]));",
 "  p.push(...RG(TAP(up?[[64,98],[66,113],[64,124]]:[[62,100],[54,112],[46,120]],[16,13],mid),'hl2'));\n  p.push(...RG(TAP(up?[[120,98],[122,113],[120,124]]:[[118,100],[126,112],[134,120]],[16,13],mid),'fl2'));\n  p.push(...TUBE(CURVE([[44,94],[30,96],[18,100],[4,104]],4),20,liz?5:9,c[0]));\n  if(!liz)for(let i=0;i<4;i++)p.push(TRI([12+i*9,96-i],[16+i*9,86-i],[22+i*9,96-i],c[1]));RG(p,'tail');"),
("  else for(let i=0;i<7;i++)p.push(SHADE(EP(52+i*14,up?74:82,4,3),mix(c[1],c[2],.1),.8));\n",
 "  else for(let i=0;i<7;i++)p.push(SHADE(EP(52+i*14,up?74:82,4,3),mix(c[1],c[2],.1),.8));\n  RG(p,'body');\n"),
("    p.push(...TUBE(CURVE(N,6),16,11,c[0]));sx=N[3][0]+4;sy=N[3][1];}",
 "    p.push(...RG(TUBE(CURVE(N,6),16,11,c[0]),'neck'));sx=N[3][0]+4;sy=N[3][1];}"),
("  else p.push(...TEETH(sx+4,sy+4,sx+SL-2,sy+2,Math.max(3,Math.round(SL/8)),o.bt?7:5.4));",
 "  else p.push(...RG(TEETH(sx+4,sy+4,sx+SL-2,sy+2,Math.max(3,Math.round(SL/8)),o.bt?7:5.4),'teeth'));"),
("  p.push(...EYE(sx,sy-7*HD,4.2,c[2]));\n  if(up){p.push(...TAP([[74,98],[76,113],[74,124]],[18,15],c[0]),...TAP([[128,98],[130,113],[128,124]],[18,15],c[0]));\n    p.push(F('M66,124 L88,124 L88,130 L66,130 Z',c[0]),F('M120,124 L142,124 L142,130 L120,130 Z',c[0]));}\n  else{p.push(...TAP([[72,100],[64,112],[56,120]],[18,14],c[0]),...TAP([[126,100],[134,112],[142,120]],[18,14],c[0]));\n    p.push(FOOT(48,126,3,c[0]),FOOT(134,126,3,c[0]));}\n  return {p,sc:o.sc||1};",
 "  p.push(...EYE(sx,sy-7*HD,4.2,c[2]));RG(p,'head');\n  if(up){p.push(...RG(TAP([[74,98],[76,113],[74,124]],[18,15],c[0]),'hl'),...RG(TAP([[128,98],[130,113],[128,124]],[18,15],c[0]),'fl'));\n    p.push(RG(F('M66,124 L88,124 L88,130 L66,130 Z',c[0]),'hl'),RG(F('M120,124 L142,124 L142,130 L120,130 Z',c[0]),'fl'));}\n  else{p.push(...RG(TAP([[72,100],[64,112],[56,120]],[18,14],c[0]),'hl'),...RG(TAP([[126,100],[134,112],[142,120]],[18,14],c[0]),'fl'));\n    p.push(RG(FOOT(48,126,3,c[0]),'hl'),RG(FOOT(134,126,3,c[0]),'fl'));}\n  return {p,sc:o.sc||1,j:{body:[96,up?84:88],hl2:[62,98],fl2:[118,98],hl:[72,98],fl:[128,98],tail:[44,94,4,104],neck:[146,84,sx-4,sy],head:[sx-6,sy],jaw:[sx-2,sy+1,sx+SL+2,sy-1]}};"),
# wąż: całe ciało giętkie od ogona do głowy; głowa osobno, szczęka przycięta z głowy
("  p.push(...TUBE(pts,t=>3+Math.sin(Math.min(1,t*1.6)*PI*.5)*20-(t>.8?(t-.8)*20:0),0,c[0]));\n  for(let i=3;i<pts.length-2;i+=2){const [x,y]=pts[i];p.push(SHADE(EP(x,y-2,5,3.5),mix(c[1],c[2],.15),.8));}\n  p.push(F('M148,70",
 "  p.push(...TUBE(pts,t=>3+Math.sin(Math.min(1,t*1.6)*PI*.5)*20-(t>.8?(t-.8)*20:0),0,c[0]));\n  for(let i=3;i<pts.length-2;i+=2){const [x,y]=pts[i];p.push(SHADE(EP(x,y-2,5,3.5),mix(c[1],c[2],.15),.8));}\n  RG(p,'body');p.push(F('M148,70"),
("...EYE(170,66,3.8,c[2]));\n  return {p,sc:o.sc||1};\n}",
 "...EYE(170,66,3.8,c[2]));\n  return {p,sc:o.sc||1,j:{body:[110,124,6,108],head:[154,76],jaw:[160,77,190,74]}};\n}"),
# żaglowiec
("  p.push(...TAP([[66,100],[58,112],[50,120]],[15,12],mid),...TAP([[120,100],[128,112],[136,120]],[15,12],mid));\n  p.push(...TUBE(CURVE([[48,96],[34,98],[22,100],[8,104]],3),19,8,c[0]));",
 "  p.push(...RG(TAP([[66,100],[58,112],[50,120]],[15,12],mid),'hl2'),...RG(TAP([[120,100],[128,112],[136,120]],[15,12],mid),'fl2'));\n  p.push(...RG(TUBE(CURVE([[48,96],[34,98],[22,100],[8,104]],3),19,8,c[0]),'tail'));"),
("mix(c[1],c[2],.6),1));}\n  p.push(F('M44,96",
 "mix(c[1],c[2],.6),1));}\n  RG(p,'sail');p.push(F('M44,96"),
("  p.push(F(o.short?'M144,84",
 "  RG(p,'body');p.push(F(o.short?'M144,84"),
("...TEETH(146,92,176,92,4),...EYE(154,84,4.2,c[2]));\n  p.push(...TAP([[76,98],[68,112],[60,120]],[18,15],c[0]),...TAP([[130,98],[138,112],[146,120]],[18,15],c[0]));\n  p.push(FOOT(52,126,3,c[0]),FOOT(138,126,3,c[0]));\n  return {p,sc:o.sc||1};",
 "...RG(TEETH(146,92,176,92,4),'teeth'),...EYE(154,84,4.2,c[2]));RG(p,'head');\n  p.push(...RG([...TAP([[76,98],[68,112],[60,120]],[18,15],c[0]),FOOT(52,126,3,c[0])],'hl'),...RG([...TAP([[130,98],[138,112],[146,120]],[18,15],c[0]),FOOT(138,126,3,c[0])],'fl'));\n  return {p,sc:o.sc||1,j:{body:[96,90],hl2:[66,98],fl2:[120,98],hl:[76,96],fl:[130,96],tail:[48,96,8,104],sail:[98,80],head:[144,88],jaw:o.short?[150,92,176,92]:[148,91,188,92]}};"),
# synapsydy
("  p.push(...leg(70,98,16,mid),...leg(114,96-sl*.4,16,mid));\n  p.push(...TUBE(",
 "  p.push(...RG(leg(70,98,16,mid),'hl2'),...RG(leg(114,96-sl*.4,16,mid),'fl2'));\n  p.push(...RG(TUBE("),
("gor?16:18,gor?4:10,c[0]));\n  p.push(BL(90,88",
 "gor?16:18,gor?4:10,c[0]),'tail'));\n  p.push(BL(90,88"),
("  p.push(SHADE('M60,96 C82,110 114,110 128,96 C120,112 72,114 60,96 Z',c[1],.45));\n  const hy=",
 "  p.push(SHADE('M60,96 C82,110 114,110 128,96 C120,112 72,114 60,96 Z',c[1],.45));RG(p,'body');\n  const hy="),
("...TEETH(144,hy+12,164,hy+13,3),...EYE(150,hy+2,4,c[2]));",
 "...RG(TEETH(144,hy+12,164,hy+13,3),'teeth'),...EYE(150,hy+2,4,c[2]));"),
("  p.push(...leg(82,96,19,c[0]),...leg(124,94-sl*.4,19,c[0]));\n  return {p,sc:o.sc||1};",
 "  RG(p,'head');p.push(...RG(leg(82,96,19,c[0]),'hl'),...RG(leg(124,94-sl*.4,19,c[0]),'fl'));\n  return {p,sc:o.sc||1,j:{body:[90,88],hl2:[70,98],fl2:[114,96-sl*.4],hl:[82,96],fl:[124,94-sl*.4],tail:gor?[56,88,6,106]:[56,90,34,98],head:[126,hy+8],\n    jaw:gor?[140,hy+10,188,hy+10]:hk==='thick'?[150,hy+18,168,hy+14]:[148,hy+14,176,hy+14]}};"),
]
for a,b in R:
  n=s.count(a)
  if n!=1: sys.exit(f'{n} matches: {a[:70]!r}')
  s=s.replace(a,b)
open(f,'w').write(s); print('ok',len(R))
