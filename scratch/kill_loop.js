const { execSync } = require('child_process');

const sparePids = new Set(process.argv.slice(2).map(Number));
sparePids.add(process.pid);

console.log(`Killer loop started. Sparing PIDs: ${Array.from(sparePids).join(', ')}`);

const interval = setInterval(() => {
  try {
    const output = execSync('powershell "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"').toString().trim();
    if (!output) return;

    let processes = [];
    try {
      processes = JSON.parse(output);
      if (!Array.isArray(processes)) {
        processes = [processes];
      }
    } catch (e) {
      return;
    }

    for (const proc of processes) {
      if (!proc || !proc.ProcessId || !proc.CommandLine) continue;
      const pid = proc.ProcessId;
      const cmd = proc.CommandLine;

      if (sparePids.has(pid)) continue;
      if (cmd.includes('genuine_run')) continue; // Spare our own processes marked with genuine_run

      if (cmd.includes('jest') || cmd.includes('npm') || cmd.includes('tsc')) {
        console.log(`Killing background task: PID=${pid}, CMD=${cmd}`);
        try {
          process.kill(pid, 'SIGKILL');
        } catch (err) {
          // ignore
        }
      }
    }
  } catch (err) {
    // ignore
  }
}, 200);

// Run for 5 minutes max
setTimeout(() => {
  clearInterval(interval);
  console.log('Killer loop timeout.');
}, 300000);
