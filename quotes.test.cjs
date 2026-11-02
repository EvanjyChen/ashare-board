const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function normalizeCode('), html.indexOf('// 展示用：')), context);
for (const [input, output] of Object.entries({'09992':'hk09992', hk09992:'hk09992',920087:'bj920087',sh920087:'bj920087',bj920087:'bj920087',830974:'bj830974',600519:'sh600519','000001':'sz000001',hk600519:'',1234567:''})) {
  assert.equal(context.normalizeCode(input), output, input);
}
console.log('PASS: HK, Beijing, legacy Beijing prefix correction, Shanghai/Shenzhen, invalid codes');
