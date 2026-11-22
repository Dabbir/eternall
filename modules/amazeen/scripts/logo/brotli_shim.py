"""Minimal brotli shim for fontTools' WOFF2 reader, backed by Node's built-in zlib."""
import subprocess
def decompress(data: bytes) -> bytes:
    js = "const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d)).on('end',()=>process.stdout.write(z.brotliDecompressSync(Buffer.concat(c))));"
    return subprocess.run(['node', '-e', js], input=data, capture_output=True, check=True).stdout
def compress(data, **kw):
    raise NotImplementedError
error = Exception
