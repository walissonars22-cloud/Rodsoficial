/** Leitor XLSX nativo no navegador: sem dependências externas.
 * Suporta ZIP/deflate padrão, sharedStrings, inline strings, datas e várias abas.
 */
function bytes16(a: Uint8Array, p: number) { return a[p] | (a[p+1] << 8); }
function bytes32(a: Uint8Array, p: number) { return (a[p] | (a[p+1]<<8) | (a[p+2]<<16) | (a[p+3]<<24)) >>> 0; }
async function unzip(file: File): Promise<Map<string, Uint8Array>> {
  const src = new Uint8Array(await file.arrayBuffer());
  const end = (() => { for(let i=src.length-22;i>=Math.max(0,src.length-65557);i--) if(bytes32(src,i)===0x06054b50)return i; return -1; })();
  if(end<0)throw new Error("Arquivo XLSX inválido: não foi encontrada uma estrutura ZIP válida.");
  const entries=bytes16(src,end+10), offset=bytes32(src,end+16);
  let pos=offset;
  const result=new Map<string,Uint8Array>();
  for(let n=0;n<entries;n++){
    if(bytes32(src,pos)!==0x02014b50)throw new Error("Diretório interno do arquivo XLSX inválido.");
    const method=bytes16(src,pos+10),compressed=bytes32(src,pos+20),fileNameLength=bytes16(src,pos+28);
    const extra=bytes16(src,pos+30),comment=bytes16(src,pos+32),local=bytes32(src,pos+42);
    const filename=new TextDecoder().decode(src.slice(pos+46,pos+46+fileNameLength));
    pos+=46+fileNameLength+extra+comment;
    if(!filename.startsWith("xl/"))continue;
    if(bytes32(src,local)!==0x04034b50)throw new Error("Cabeçalho interno XLSX inválido.");
    const start=local+30+bytes16(src,local+26)+bytes16(src,local+28);
    const compressedBytes=src.slice(start,start+compressed);
    if(method===0)result.set(filename,compressedBytes);
    else if(method===8){
      if(typeof DecompressionStream==="undefined")throw new Error("Este navegador não suporta leitura de XLSX compactado. Atualize-o.");
      const decompressed=new Response(new Blob([Uint8Array.from(compressedBytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
      result.set(filename,new Uint8Array(await decompressed.arrayBuffer()));
    }else throw new Error("Formato de compactação XLSX não suportado.");
  }
  return result;
}
function xml(text:string): Document {
  const doc=new DOMParser().parseFromString(text,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw new Error("XML inválido no Excel.");
  return doc;
}
function children(element:Element, tag:string):Element[]{
  return Array.from(element.children).filter(e=>e.localName===tag);
}
function descendants(element:Document|Element,tag:string):Element[]{
  return Array.from(element.getElementsByTagName("*")).filter(e=>e.localName===tag);
}
function colIndex(ref:string):number {
  const letters=ref.match(/^[A-Z]+/i)?.[0]??"";
  let value=0;for(const c of letters.toUpperCase())value=value*26+c.charCodeAt(0)-64;
  return value-1;
}
function strings(doc:Document):string[] {
  return descendants(doc,"si").map(si=>descendants(si,"t").map(t=>t.textContent??"").join(""));
}
function excelDate(value:number):Date { return new Date(Date.UTC(1899,11,30)+value*86400000); }
function sheetRows(bytes:Uint8Array, shared:string[], dateStyles:Set<number>):unknown[][] {
  const doc=xml(new TextDecoder().decode(bytes));
  return descendants(doc,"row").map(row=>{
    const result:unknown[]=[];
    for(const cell of children(row,"c")){
      const idx=colIndex(cell.getAttribute("r")??"");
      if(idx<0 || idx>1024)continue;
      const kind=cell.getAttribute("t"), value=children(cell,"v")[0]?.textContent??"";
      let parsed:unknown=value;
      if(kind==="s")parsed=shared[Number(value)]??"";
      else if(kind==="inlineStr")parsed=descendants(cell,"t").map(x=>x.textContent??"").join("");
      else if(kind==="b")parsed=value==="1";
      else if(kind==="e")parsed="";
      else if(value!==""&&!Number.isNaN(Number(value))){
        const num=Number(value),style=Number(cell.getAttribute("s")??0);
        parsed=dateStyles.has(style)?excelDate(num):num;
      }
      result[idx]=parsed;
    }
    return result;
  });
}
function dateStyleIndexes(stylesDoc:Document|undefined):Set<number> {
 const found=new Set<number>();
 if(!stylesDoc)return found;
 const formats=new Map<number,string>();
 for(const el of descendants(stylesDoc,"numFmt"))formats.set(Number(el.getAttribute("numFmtId")),el.getAttribute("formatCode")??"");
 const cellXfs=descendants(stylesDoc,"cellXfs")[0];
 if(!cellXfs)return found;
 for(const [i,xf] of children(cellXfs,"xf").entries()){
   const n=Number(xf.getAttribute("numFmtId")??0);
   if(([14,15,16,17,22,27,30,36,45,46,47,50,57].includes(n))||/[dmyhs]/i.test((formats.get(n)??"").replace(/"[^"]*"|\[[^\]]*\]/g,"")))found.add(i);
 }
 return found;
}
export async function readExcelWorkbook(file:File):Promise<{name:string;rows:unknown[][]}[]>{
 const zip=await unzip(file);
 const required=(name:string)=>{const bytes=zip.get(name);if(!bytes)throw new Error("O arquivo não contém "+name+".");return xml(new TextDecoder().decode(bytes));};
 const workbook=required("xl/workbook.xml");
 const rels=required("xl/_rels/workbook.xml.rels");
 const relationships=new Map(descendants(rels,"Relationship").map(el=>[el.getAttribute("Id"),el.getAttribute("Target")??""]));
 const shared=zip.has("xl/sharedStrings.xml")?strings(required("xl/sharedStrings.xml")):[];
 const dateStyles=dateStyleIndexes(zip.has("xl/styles.xml")?required("xl/styles.xml"):undefined);
 const workbookSheets=descendants(workbook,"sheet");
 if(!workbookSheets.length)throw new Error("O arquivo Excel não possui planilhas.");
 return workbookSheets.map(sheet=>{
   const id=sheet.getAttribute("r:id")??sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
   const target=relationships.get(id);
   if(!target)throw new Error("Não foi possível localizar uma aba do arquivo.");
   const path=target.startsWith("/")?target.slice(1):"xl/"+target.replace(/^(\.\/)+/,"");
   const normalized=path.replace(/(^|\/)\.\//g,"").replace(/\/[^/]+\/\.\.\//g,"/");
   const bytes=zip.get(normalized);
   if(!bytes)throw new Error("Aba não encontrada no arquivo: "+normalized);
   return {name:sheet.getAttribute("name")??"Planilha",rows:sheetRows(bytes,shared,dateStyles)};
 });
}
