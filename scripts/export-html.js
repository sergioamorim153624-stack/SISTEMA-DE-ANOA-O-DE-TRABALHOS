import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';

const root=resolve(import.meta.dirname,'..');
mkdirSync(resolve(root,'downloads'),{recursive:true});
copyFileSync(resolve(root,'standalone/index.html'),resolve(root,'downloads/Nexo.html'));
const archive = zipSync({
  'Nexo.html': new Uint8Array(readFileSync(resolve(root,'standalone/index.html'))),
  'LEIA-ME.txt': strToU8(`NEXO — GESTÃO DE SERVIÇOS\n\n1. Extraia todos os arquivos deste ZIP para uma pasta no seu computador.\n2. Abra Nexo.html com Chrome, Edge ou Firefox.\n3. Em Configurações, informe o nome do seu cliente.\n\nNão é necessário instalar Node.js ou iniciar um servidor. Esta é a versão independente, com serviços e histórico armazenados neste navegador. Ela não envia seus registros ao GitHub e não sincroniza entre navegadores. Evite o modo anônimo. Guarde o arquivo na mesma pasta e use Configurações > Exportar backup periodicamente, especialmente antes de limpar os dados do navegador ou trocar de computador. Importe o JSON para transferir seus registros.\n\nO prazo começa ao iniciar o serviço; dias são corridos de 24 horas. Valores e prazos podem ser ajustados no Catálogo.\n`),
}, { level: 9 });
writeFileSync(resolve(root,'downloads/Nexo.zip'),archive);
console.log('Aplicativo completo exportado para downloads/Nexo.html e downloads/Nexo.zip');
