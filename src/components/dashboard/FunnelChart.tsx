import { Maximize2 } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/store/AppContext";

const W = 560, H = 214, BASE_Y = 92;
const KEYS = [0,186,373,560], HALF = [72,54,38,22];
type Pt = {x:number;y:number};

function halfAt(x:number):number {
  for (let i=0;i<KEYS.length-1;i++) {
    if (x>=KEYS[i]&&x<=KEYS[i+1]) {
      const t=(x-KEYS[i])/(KEYS[i+1]-KEYS[i]);
      const s=t*t*(3-2*t);
      return HALF[i]+(HALF[i+1]-HALF[i])*s;
    }
  }
  return HALF[HALF.length-1];
}
const centerAt=(x:number)=>BASE_Y+Math.sin(x/120)*5;

function smooth(pts:Pt[]):string {
  if (pts.length<2) return "";
  let d=`M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i=0;i<pts.length-1;i++) {
    const p0=pts[i-1]??pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]??p2;
    const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6;
    const c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
    d+=` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function ribbon(scale:number,phase:number):string {
  const top:Pt[]=[],bottom:Pt[]=[];
  for (let x=0;x<=W;x+=12) {
    const c=centerAt(x)+Math.sin(x/150+phase)*4,h=halfAt(x)*scale;
    top.push({x,y:c-h}); bottom.push({x,y:c+h});
  }
  return `${smooth(top)} ${smooth(bottom.reverse()).replace(/^M/,"L")} Z`;
}

function centerLine(phase:number):string {
  const pts:Pt[]=[];
  for (let x=0;x<=W;x+=12) pts.push({x,y:centerAt(x)+Math.sin(x/150+phase)*4});
  return smooth(pts);
}

const LAYERS=[
  {scale:1,phase:.6,fill:"#222468",opacity:.07},
  {scale:.72,phase:1.9,fill:"#222468",opacity:.14},
  {scale:.46,phase:3.2,fill:"url(#funnelGrad)",opacity:.92},
];
const MARK_X=[54,205,356,508];

export function FunnelChart() {
  const { funnel, setView } = useApp();
  const ribbons = useMemo(()=>LAYERS.map(l=>({...l,d:ribbon(l.scale,l.phase)})),[]);
  const lines = useMemo(()=>[centerLine(3.2),centerLine(1.9)],[]);

  return (
    <section className="flex min-h-[248px] flex-col rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">Conversion Funnel</h2>
          <span className="rounded-full bg-[#EA7218]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EA7218]">Last 30 days</span>
        </div>
        <button onClick={()=>setView("customers")} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"><Maximize2 className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-1 items-center gap-4">
        <div className="w-[128px] shrink-0">
          <p className="text-[11.5px] font-semibold text-zinc-400">New Leads</p>
          <p className="font-display text-[42px] font-bold leading-none tracking-tight text-zinc-950">{funnel.newLeads}</p>
          <p className="mt-1.5 text-[11.5px] font-semibold text-emerald-600">{funnel.delta} <span className="font-medium text-zinc-400">vs last month</span></p>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#222468]"/><span className="text-[10.5px] font-medium text-zinc-500">Core stream</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#222468]/20"/><span className="text-[10.5px] font-medium text-zinc-500">Lead halo</span></div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
            <defs>
              <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0.25">
                <stop offset="0%" stopColor="#EA7218"/>
                <stop offset="55%" stopColor="#222468"/>
                <stop offset="100%" stopColor="#1a1c54"/>
              </linearGradient>
            </defs>
            {MARK_X.map(x=><line key={x} x1={x} y1={14} x2={x} y2={172} stroke="#E4E4E7" strokeDasharray="3 5" strokeWidth={1}/>)}
            {ribbons.map((r,i)=><path key={i} d={r.d} fill={r.fill} opacity={r.opacity} className="anim-ribbon" style={{animationDelay:`${i*.12}s`}}/>)}
            {lines.map((d,i)=><path key={i} d={d} fill="none" stroke={i===0?"rgba(255,255,255,0.75)":"rgba(34,36,104,0.35)"} strokeWidth={i===0?1.4:1} strokeLinecap="round" strokeDasharray="1 12" className="flow-dash"/>)}
            {MARK_X.map((x,i)=>(
              <g key={x}>
                <circle cx={x} cy={centerAt(x)} r={4.5} fill="#fff" stroke="#222468" strokeWidth={2.4}/>
                <text x={x} y={188} textAnchor="middle" className="fill-zinc-500" fontSize={11} fontWeight={600}>{funnel.stages[i].label}</text>
                <text x={x} y={204} textAnchor="middle" fontSize={12} fontWeight={800} className="fill-zinc-900">
                  {funnel.stages[i].pct}%<tspan className="fill-zinc-400" fontSize={10} fontWeight={500}>{"  "}· {funnel.stages[i].count}</tspan>
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
