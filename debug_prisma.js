const { exec } = require('child_process');
const fs = require('fs');

exec('npx prisma format', { cwd: 'c:\\Users\\kachi\\Documents\\TempS\\apais' }, (error, stdout, stderr) => {
    const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error ? error.message : 'None'}`;
    fs.writeFileSync('c:\\Users\\kachi\\Documents\\TempS\\apais\\debug_output.txt', output);
});
