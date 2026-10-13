import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(4173,'0.0.0.0',()=>{
 console.log('Lift Studio: http://localhost:4173');
 if(process.argv.includes('--open')){
  const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['/c','start','','http://localhost:4173']:['http://localhost:4173'];
  const child=spawn(command,args,{detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();
 }
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 4173 is in use. Close the existing simulator, or open http://localhost:4173.':error.message);process.exitCode=1;});
