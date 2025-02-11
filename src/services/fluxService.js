const axios = require('axios');
const config = require('config');
const log = require('../lib/log');

const axiosConfig = {
  timeout: 13456,
};

async function getFluxList(fallback) {
  try {
    let url = `${config.explorer}/api/zelnode/listzelnodes`;
    if (fallback) {
      url = `${config.fallbackexplorer}/api/zelnode/listzelnodes`;
    }
    const zelnodeList = await axios.get(url, axiosConfig);
    return zelnodeList.data.result || [];
  } catch (e) {
    if (!fallback) {
      return getFluxList(true);
    }
    log.error(e);
    return [];
  }
}

async function getFluxIPs() {
  try {
    const zelnodes = await getFluxList();
    const ips = zelnodes.map((zelnode) => zelnode.ip);
    const correctIps = [];
    const ipvTest = new RegExp('^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(.(?!$)|$)){4}$');
    ips.forEach((ip) => {
      if (ipvTest.test(ip)) {
        correctIps.push(ip);
      }
    });
    return correctIps;
  } catch (e) {
    log.error(e);
    return [];
  }
}

async function getSingleNodeAppLocation(ip, application) {
  try {
    const zelnodeList = await axios.get(`http://${ip}:16127/zelapps/location/${application}`, axiosConfig);
    if (zelnodeList.data.status === 'success') {
      return zelnodeList.data.data || [];
    }
    return [];
  } catch (e) {
    log.error(e);
    return [];
  }
}

// check where an application is running
// let it throw
async function getApplicationLocation(application) {
  const zelnodelist = await getFluxIPs();
  if (zelnodelist.length < 10) {
    throw new Error('Invalid Flux List');
  }
  // choose 10 random nodes and get chainwebnode locations from them
  const stringOfTenChars = 'qwertyuiop';
  const applocations = [];
  // eslint-disable-next-line no-restricted-syntax, no-unused-vars
  for (const index of stringOfTenChars) { // async inside
    const randomNumber = Math.floor((Math.random() * zelnodelist.length));
    // eslint-disable-next-line no-await-in-loop
    const al = await getSingleNodeAppLocation(zelnodelist[randomNumber], application);
    al.forEach((node) => {
      applocations.push(node.ip);
    });
  }
  // create a set of it so we dont have duplicates
  const appLocOK = [...new Set(applocations)]; // continue running checks
  return appLocOK;
}

module.exports = {
  getFluxIPs,
  getApplicationLocation,
};
