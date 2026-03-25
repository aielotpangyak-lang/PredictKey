import fs from 'fs';
const path = './src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<button([^>]*)className="([^"]*)"/g, (match, p1, p2) => {
  if (!p2.includes('active:scale-95')) {
    let newClasses = p2;
    if (!newClasses.includes('transition-')) {
        newClasses += ' transition-transform';
    }
    newClasses += ' active:scale-95 hover:scale-[1.02]';
    return `<button${p1}className="${newClasses.trim()}"`;
  }
  return match;
});

fs.writeFileSync(path, content);
console.log('Done');
