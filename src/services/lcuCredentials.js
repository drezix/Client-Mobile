const { exec } = require('child_process');

function getLeagueCredentials() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? 'wmic PROCESS WHERE "name=\'LeagueClientUx.exe\'" GET commandline'
      : 'ps x -o args | grep "LeagueClientUx"';

    exec(command, (error, stdout) => {
      if (error || !stdout || !stdout.includes('--remoting-auth-token=')) {
        return reject('Cliente do LoL não encontrado.');
      }
      const tokenMatch = stdout.match(/--remoting-auth-token=([^ "]+)/);
      const portMatch = stdout.match(/--app-port=([^ "]+)/);
      if (!tokenMatch || !portMatch) return reject('Não foi possível extrair token ou porta.');
      resolve({ token: tokenMatch[1], port: portMatch[1] });
    });
  });
}

module.exports = { getLeagueCredentials };