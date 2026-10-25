import { cp, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
await cp('node_modules/@excalidraw/excalidraw/dist/prod/fonts', '../../rascunho/fonts', { recursive: true });
await mkdir('../../rascunho/licencas', { recursive: true });
await copyFile('Excalidraw-LICENSE.txt', '../../rascunho/licencas/Excalidraw.txt');
await copyFile('node_modules/react/LICENSE', '../../rascunho/licencas/React.txt');
await copyFile('node_modules/react-dom/LICENSE', '../../rascunho/licencas/ReactDOM.txt');
// Preserve the notices shipped by the bundled dependencies and fonts.
const notices = [];
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory() && !entry.name.startsWith('.')) await collect(path);
    else if (entry.isFile() && /^(licen[cs]e|copying|notice|ofl)([.-]|$)/i.test(entry.name)) {
      notices.push(`\n\n===== ${path} =====\n${await readFile(path, 'utf8')}`);
    }
  }
}
await collect('node_modules');
await writeFile('../../rascunho/licencas/Terceiros.txt', notices.join(''));
