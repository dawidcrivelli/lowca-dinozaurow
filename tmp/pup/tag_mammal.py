# Tagowanie regionów wycinanek: A_amphib (bok), A_mammal, A_sloth, A_turtle, A_bird
import sys
f='js/art.js'; s=open(f).read()
R=[
# płaz z boku
("  p.push(K(PL([[70,110],[58,120],[46,126]]),13,mid),K(PL([[124,110],[136,120],[148,126]]),13,mid));\n  p.push(...TUBE(CURVE([[52,100],[36,102],[22,106],[8,110]],3),20,6,c[0]));",
 "  p.push(RG(K(PL([[70,110],[58,120],[46,126]]),13,mid),'hl2'),RG(K(PL([[124,110],[136,120],[148,126]]),13,mid),'fl2'));\n  p.push(...RG(TUBE(CURVE([[52,100],[36,102],[22,106],[8,110]],3),20,6,c[0]),'tail'));"),
("  p.push(SHADE('M56,108 C84,118 116,118 136,106 C124,120 68,122 56,108 Z',c[1],.45));\n  p.push(K(PL([[136,96+fl]",
 "  p.push(SHADE('M56,108 C84,118 116,118 136,106 C124,120 68,122 56,108 Z',c[1],.45));RG(p,'body');\n  p.push(K(PL([[136,96+fl]"),
("2.4),...TEETH(150,106,186,106,5,4));", "2.4),...RG(TEETH(150,106,186,106,5,4),'teeth'));"),
("  if(!o.flat) p.push(...EYE(176,96,3.8,c[2]));\n  p.push(K(PL([[68,104],[56,96],[44,92]]),12,c[0]),K(PL([[122,104],[134,96],[146,92]]),12,c[0]));\n  return {p,sc:o.sc||1};",
 "  if(!o.flat) p.push(...EYE(176,96,3.8,c[2]));\n  RG(p,'head');p.push(RG(K(PL([[68,104],[56,96],[44,92]]),12,c[0]),'hl'),RG(K(PL([[122,104],[134,96],[146,92]]),12,c[0]),'fl'));\n  return {p,sc:o.sc||1,j:{body:[94,100],hl2:[70,108],fl2:[124,108],hl:[68,104],fl:[122,104],tail:[52,100,8,110],head:[138,98],jaw:o.flat?[142,106,196,104]:[144,104,192,102]}};"),
# ssaki
("  const legs=(f,d,w)=>[...LEG4(bx-rx*.62+d,by+ry*.2,w,f,ft,hock),...LEG4(bx+rx*.55+d,by+ry*.2,w,f,ft)];\n  p.push(...legs(mid,-6,lw*.95));",
 "  const legs=(f,d,w,n='')=>[...RG(LEG4(bx-rx*.62+d,by+ry*.2,w,f,ft,hock),'hl'+n),...RG(LEG4(bx+rx*.55+d,by+ry*.2,w,f,ft),'fl'+n)];\n  p.push(...legs(mid,-6,lw*.95,2));"),
("  else if(o.tail!=='none') p.push(...TUBE(CURVE([[bx-rx*.9,by-ry*.2],[bx-rx-6,by-ry*.1],[bx-rx-10,by+2],[bx-rx-12,by+10]],3),7,4,c[0]));\n",
 "  else if(o.tail!=='none') p.push(...TUBE(CURVE([[bx-rx*.9,by-ry*.2],[bx-rx-6,by-ry*.1],[bx-rx-10,by+2],[bx-rx-12,by+10]],3),7,4,c[0]));\n  RG(p,'tail');\n"),
("  if(hd==='deer') p.push(K(`M${P(x-2,y-8)}", "  if(hd==='deer') p.push(...RG([K(`M${P(x-2,y-8)}"),
("[x+50,y-44]],4,9,5,mid,{t0:.3,t1:1}));", "[x+50,y-44]],4,9,5,mid,{t0:.3,t1:1})],'head'));"),
("c[1],.45));\n  p.push(...TUBE(CURVE([S,", "c[1],.45));RG(p,'body');\n  p.push(...TUBE(CURVE([S,"),
("  if(o.fur) p.push(...SPINES([S,[S[0]+nk[0]*.3,S[1]+nk[1]*.6+14],[x,y+18],[x+4,y+14]],4,8,8,c[0],{side:-1,t0:.2,t1:.9}));\n",
 "  if(o.fur) p.push(...SPINES([S,[S[0]+nk[0]*.3,S[1]+nk[1]*.6+14],[x,y+18],[x+4,y+14]],4,8,8,c[0],{side:-1,t0:.2,t1:.9}));\n  RG(p,'neck');\n"),
("    if(o.sab) p.push(HORN(x+11,y+8,22,95,6,-4,iv),HORN(x+17,y+8,20,92,5,-4,iv));",
 "    if(o.sab) p.push(...RG([HORN(x+11,y+8,22,95,6,-4,iv),HORN(x+17,y+8,20,92,5,-4,iv)],'teeth'));"),
("    p.push(...TUBE(CURVE([[x+10,y+6],[x+22,y+22],[x+20,y+48],[x+10,y+60]],7),13,7,c[0]));\n    p.push(...(dn?",
 "    p.push(...RG(TUBE(CURVE([[x+10,y+6],[x+22,y+22],[x+20,y+48],[x+10,y+60]],7),13,7,c[0]),'trunk'));\n    p.push(...RG(dn?"),
("[x+48,y+20]],8),9,4,iv)));", "[x+48,y+20]],8),9,4,iv),'teeth'));"),
("      ...TEETH(x+2,y+6,x+32,y+5,5,5),F(", "      ...RG(TEETH(x+2,y+6,x+32,y+5,5,5),'teeth'),F("),
("  p.push(...legs(c[0],4,lw));\n  return {p,sc:o.sc||1};",
 "  RG(p,'head');p.push(...legs(c[0],4,lw));\n  const hx=bx-rx*.62,fx=bx+rx*.55,ly=by+ry*.2,L=hd==='deer'?24:hd==='indri'?32:38,big=hd==='bear'?1.12:1;\n"
 "  return {p,sc:o.sc||1,j:{body:[bx,by],hl:[hx+4,ly],hl2:[hx-6,ly],fl:[fx+4,ly],fl2:[fx-6,ly],tail:[bx-rx*.9,by-ry*.3,bx-rx-24,by+14],neck:[...S,x-6,y+4],head:[x-6,y+4],trunk:[x+10,y+6,x+10,y+60],\n"
 "    jaw:{cat:[x+2,y+8,x+22*big,y+8],bear:[x+2,y+8,x+22*big,y+8],dog:[x+4,y+8,x+32,y+7],rhino:[x+L*.35,y+15,x+L+2,y+15],indri:[x+L*.35,y+15,x+L+2,y+15],deer:[x+L*.35,y+15,x+L+2,y+15],andrew:[x-4,y+4,x+37,y+4],diproto:[x+10,y+12,x+26,y+12]}[hd]}};"),
# leniwiec
("  p.push(...TUBE(CURVE([[80,108],[64,116],[46,124],[30,128]],4),26,8,c[0]));\n  p.push(...LEG4(80,104,20,mid,'paw'),K('M104,62 C114,48 124,40 134,30',12,mid));\n  for(let i=0;i<3;i++)p.push(HORN(132+i*3,30,12,-20+i*25,4,4,c[1]));",
 "  p.push(...RG(TUBE(CURVE([[80,108],[64,116],[46,124],[30,128]],4),26,8,c[0]),'tail'));\n  p.push(...RG(LEG4(80,104,20,mid,'paw'),'hl2'),RG(K('M104,62 C114,48 124,40 134,30',12,mid),'arm2'));\n  for(let i=0;i<3;i++)p.push(RG(HORN(132+i*3,30,12,-20+i*25,4,4,c[1]),'arm2'));"),
("  p.push(SHADE(EP(98,90,14,24,18),c[1],.45));\n  p.push(K(PL([[108,40]",
 "  p.push(SHADE(EP(98,90,14,24,18),c[1],.45));RG(p,'body');\n  p.push(K(PL([[108,40]"),
("...EYE(120,22,3.6,c[2]));\n  p.push(K('M104,66 C118,58 130,52 144,44',13,c[0]));\n  for(let i=0;i<3;i++)p.push(HORN(142+i*3,44,14,20+i*22,4.5,5,c[1]));\n  p.push(...LEG4(96,104,24,c[0],'paw'));\n  return {p,sc:o.sc||1};",
 "...EYE(120,22,3.6,c[2]));RG(p,'head');\n  p.push(K('M104,66 C118,58 130,52 144,44',13,c[0]));\n  for(let i=0;i<3;i++)p.push(HORN(142+i*3,44,14,20+i*22,4.5,5,c[1]));\n  RG(p,'arm');p.push(...RG(LEG4(96,104,24,c[0],'paw'),'hl'));\n  return {p,sc:o.sc||1,j:{body:[92,100],tail:[80,108,30,128],hl2:[80,104],hl:[96,104],arm2:[104,62],arm:[104,66],head:[110,36],jaw:[128,32,138,30]}};"),
# żółw
("  p.push(F('M110,94 C124,104 134,118 132,128 C118,122 106,110 102,100 Z',mid),F('M72,94 C58,104 48,118 50,128 C64,122 76,110 80,100 Z',mid));\n  p.push(F('M118,90 C138,98 154,114 154,128 C136,120 120,106 112,96 Z',c[1]),F('M64,90 C44,98 30,114 30,128 C48,120 62,106 70,96 Z',c[1]));",
 "  p.push(RG(F('M110,94 C124,104 134,118 132,128 C118,122 106,110 102,100 Z',mid),'fl2'),RG(F('M72,94 C58,104 48,118 50,128 C64,122 76,110 80,100 Z',mid),'hl2'));\n  p.push(RG(F('M118,90 C138,98 154,114 154,128 C136,120 120,106 112,96 Z',c[1]),'fl'),RG(F('M64,90 C44,98 30,114 30,128 C48,120 62,106 70,96 Z',c[1]),'hl'));"),
("${98-Math.abs(i-2)*3}`,2.4));\n  p.push(K(PL([[150,80],[160,82]]),24,c[0])",
 "${98-Math.abs(i-2)*3}`,2.4));\n  RG(p,'body');p.push(K(PL([[150,80],[160,82]]),24,c[0])"),
("...EYE(164,82,4.2,ink));\n  return {p,sc:o.sc||1,water:1};",
 "...EYE(164,82,4.2,ink));\n  return {p,sc:o.sc||1,water:1,j:{body:[96,80],fl2:[106,96],hl2:[76,96],fl:[114,92],hl:[68,92],head:[150,82],jaw:[160,96,186,100]}};"),
# ptak
("  p.push(VANE(TQ,.05,12,c[1]),K(PL([[86,90],[66,98],[44,106],[20,114]]),5,c[0]));\n  p.push(WINGF([96,76],[20,28],[82,98],5,mid));\n  if(o.four) p.push(WINGF([96,98],[40,130],[80,104],4,mid));",
 "  p.push(...RG([VANE(TQ,.05,12,c[1]),K(PL([[86,90],[66,98],[44,106],[20,114]]),5,c[0])],'tail'));\n  p.push(RG(WINGF([96,76],[20,28],[82,98],5,mid),'wing2'));\n  if(o.four) p.push(RG(WINGF([96,98],[40,130],[80,104],4,mid),'hl2'));"),
("  p.push(BL(102,84,25,16,c[0]));\n  p.push(WINGF([100,72],[40,4],[76,96],5,c[1]));\n  for(let i=0;i<3;i++)p.push(HORN(52+i*5,16+i*4,6,-10,3,2,c[1],2));\n  p.push(...TUBE(CURVE([[116,76],[126,66],[134,58],[142,54]],3),16,13,c[0]));",
 "  p.push(RG(BL(102,84,25,16,c[0]),'body'));\n  p.push(WINGF([100,72],[40,4],[76,96],5,c[1]));\n  for(let i=0;i<3;i++)p.push(HORN(52+i*5,16+i*4,6,-10,3,2,c[1],2));\n  RG(p,'wing');p.push(...RG(TUBE(CURVE([[116,76],[126,66],[134,58],[142,54]],3),16,13,c[0]),'neck'));"),
("LINE('M154,62 L172,60',2),...TEETH(154,62,170,61,4,3.8));\n  p.push(K(PL([[96,96],[98,108],[90,118]]),6,c[0]),K(PL([[108,96],[110,108],[104,120]]),6,c[0]));\n  if(o.four) p.push(WINGF([110,98],[76,134],[104,108],4,c[1]));\n  return {p,sc:o.sc||1,fly:1};",
 "LINE('M154,62 L172,60',2),...RG(TEETH(154,62,170,61,4,3.8),'teeth'));RG(p,'head');\n  p.push(...RG([K(PL([[96,96],[98,108],[90,118]]),6,c[0]),K(PL([[108,96],[110,108],[104,120]]),6,c[0])],'hl'));\n  if(o.four) p.push(RG(WINGF([110,98],[76,134],[104,108],4,c[1]),'hl'));\n  return {p,sc:o.sc||1,fly:1,j:{body:[102,84],tail:[86,90,20,114],wing2:[96,76],wing:[100,72],hl:[102,94],hl2:[98,98],neck:[116,76,142,54],head:[142,54],jaw:[152,62,172,60]}};"),
]
for a,b in R:
  n=s.count(a)
  if n!=1: sys.exit(f'{n} matches: {a[:70]!r}')
  s=s.replace(a,b)
open(f,'w').write(s); print('ok',len(R))
