export type PriceRow={product:string;category:string;provider:string;unit:string;price:number;delivery:number}
export const PRICE_ROWS:PriceRow[]=[
{product:"Punta picana",category:"Carnes",provider:"Carnes Don Pedro",unit:"kg",price:10990,delivery:3990},
{product:"Punta picana",category:"Carnes",provider:"Supermercado Centro",unit:"kg",price:12490,delivery:0},
{product:"Punta picana",category:"Carnes",provider:"Mercado Express",unit:"kg",price:9990,delivery:6990},
{product:"Longaniza parrillera",category:"Carnes",provider:"Carnes Don Pedro",unit:"kg",price:6990,delivery:3990},
{product:"Longaniza parrillera",category:"Carnes",provider:"Supermercado Centro",unit:"kg",price:7490,delivery:0},
{product:"Bebida 3L",category:"Bebidas",provider:"Supermercado Centro",unit:"unidad",price:2490,delivery:0},
{product:"Bebida 3L",category:"Bebidas",provider:"Mercado Express",unit:"unidad",price:2190,delivery:6990},
{product:"Carbón 5kg",category:"Insumos",provider:"Mercado Express",unit:"saco",price:6990,delivery:6990},
{product:"Carbón 5kg",category:"Insumos",provider:"Supermercado Centro",unit:"saco",price:7990,delivery:0},
]
export function bestRows(){const map=new Map<string,PriceRow[]>();for(const r of PRICE_ROWS){map.set(r.product,[...(map.get(r.product)||[]),r])}return [...map.entries()].map(([product,rows])=>({product,rows:[...rows].sort((a,b)=>(a.price+a.delivery)-(b.price+b.delivery)),best:[...rows].sort((a,b)=>(a.price+a.delivery)-(b.price+b.delivery))[0]}))}
