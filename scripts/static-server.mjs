import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function serveStatic(port=Number(process.env.MIXTURE_TEST_PORT ?? 4173)) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid static server port');
  const root=resolve('dist');
  const server=createServer(async(req,res)=>{
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(!pathname.startsWith('/player/'))throw new Error('Not found');
      const file=resolve(root,pathname.slice(8)||'index.html');
      if(!file.startsWith(root+sep)||(await stat(file)).isDirectory())throw new Error('Not found');
      const bytes=await readFile(file);
      res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.mix':'application/json'})[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
      res.end(bytes);
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  return server;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)await serveStatic();
