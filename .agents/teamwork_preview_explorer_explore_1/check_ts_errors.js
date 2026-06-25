const ts = require('typescript');
const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, '../../tsconfig.json');
const parsed = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(parsed.config, ts.sys, path.dirname(configPath));

const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

diagnostics.forEach(diag => {
  if (diag.file && diag.start) {
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    const lineContent = diag.file.text.split('\n')[line];
    console.log(`${diag.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
    console.log(`  Line content: "${lineContent ? lineContent.trim() : ''}"`);
  } else {
    console.log(ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
  }
});
